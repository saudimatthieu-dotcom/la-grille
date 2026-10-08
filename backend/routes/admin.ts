import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { tacticsOf } from "../modules/leaguePoints";
import { getPublicLeague } from "../modules/publicLeague";
import { pointsInLeague, scorePrediction } from "../modules/scoring";
import { postWeeklyRecaps } from "../modules/weeklyRecap";
import { finishSeasons } from "../modules/seasons";
import { awardMonthlyPrize } from "../modules/monthlyPrize";
import { extendVip, isVip } from "../modules/vip";
import type { Result } from "../modules/scoring";
import { fetchEventResult } from "../providers/thesportsdb";
import { fetchRacePodium } from "../providers/jolpica";
import { IMPORT_DAYS, importUpcomingEvents } from "../modules/importEvents";

const router = express.Router();

// Admin routes are called by cron-job.org with the secret from .env
function isAdmin(secret: unknown) {
  return Boolean(process.env.ADMIN_SECRET) && secret === process.env.ADMIN_SECRET;
}

// POST /admin/sync-events — imports the matches of the coming month from the sports APIs (cron-job.org)
router.post("/sync-events", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  sendImport(res);
});

// Answers with the number of matches imported — takes 1 to 2 minutes
function sendImport(res: express.Response) {
  importUpcomingEvents()
    .then((imported) => {
      if (imported === null) {
        res.json({ result: false, error: "An import is already running" });
        return;
      }

      res.json({ result: true, imported, days: IMPORT_DAYS });
    })
    .catch(() => res.json({ result: false, error: "Sports API unavailable" }));
}

// POST /admin/sync-results — fetches the final result of every event that has started
router.post("/sync-results", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  Event.find({ status: "scheduled", startsAt: { $lt: new Date() } })
    .then((events) => {
      const updates = events.map((event) => {
        const externalId = event.externalId ?? "";
        let request: Promise<Result | null> = Promise.resolve(null);

        if (event.provider === "thesportsdb") {
          request = fetchEventResult(externalId);
        } else if (event.provider === "jolpica") {
          request = fetchRacePodium(externalId);
        }

        return request.then((result) => {
          if (!result) {
            return false; // not finished yet: we'll try again at the next call
          }

          event.status = "finished";
          event.result = result;
          return event.save().then(() => true);
        });
      });

      return Promise.all(updates).then((finished) => {
        res.json({ result: true, finished: finished.filter((done) => done).length });
      });
    })
    .catch(() => res.json({ result: false, error: "Sports API unavailable" }));
});

// POST /admin/score — gives points to every prediction of a finished event, once
router.post("/score", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  Event.find({ status: "finished" }).then((events) => {
    const eventIds = events.map((event) => event._id);

    // points: null → not scored yet, so running this route twice never counts points twice
    Prediction.find({ event: { $in: eventIds }, points: null }).then((predictions) => {
      const predictionIds = predictions.map((prediction) => prediction._id);

      Promise.all([
        getPublicLeague(),
        // Bonuses and sabotages on these predictions (each prediction belongs to one league)
        Tactic.find({ prediction: { $in: predictionIds } }),
      ]).then(([publicLeague, tactics]) => {
        const sabotages = tactics.filter((tactic) => tactic.kind === "sabotage");

        const updates = predictions.map((prediction) => {
          const event = events.find((item) => prediction.event && item._id.equals(prediction.event));

          if (!event) {
            return Promise.resolve();
          }

          // The raw points, without any bonus
          const points = scorePrediction(event.sport, prediction.payload, event.result, event.ouLine ?? 0);

          prediction.points = points;
          prediction.scoredAt = new Date();

          // The prediction's league gets the points with its bonus and its sabotage
          const { bonus, sabotage } = tacticsOf(tactics, prediction._id);
          const leagueUpdate = League.updateOne(
            { _id: prediction.league, "members.user": prediction.user },
            { $inc: { "members.$.points": pointsInLeague(points, event.sport, bonus, Boolean(sabotage)) } }
          );

          // The general ranking = the public league's predictions (no bonus there: the raw points)
          const isPublicPrediction = Boolean(publicLeague && prediction.league?.equals(publicLeague._id));
          const userUpdate = isPublicPrediction
            ? User.updateOne({ _id: prediction.user }, { $inc: { points } })
            : Promise.resolve();

          return prediction.save().then(() => Promise.all([leagueUpdate, userUpdate]));
        });

        Promise.all(updates).then(() => {
          // Every sabotage scored in this run gets its line in the chat of its league
          const userIds = sabotages.flatMap((tactic) => [tactic.actor, tactic.target]);

          User.find({ _id: { $in: userIds } }).then((users) => {
            const nameOf = (id: unknown) => users.find((user) => user._id.equals(String(id)))?.username ?? "?";

            // Remembered for the results screen: "his Bouclier blocked the attack!"
            const tacticSaves = sabotages.map((tactic) => {
              // The target's bouclier on the sabotaged prediction
              tactic.shieldTriggered = Boolean(tacticsOf(tactics, tactic.prediction ?? undefined).bonus.bouclier);
              tactic.resolved = true;
              return tactic.save();
            });

            const messages = sabotages.map((tactic) => {
              const actor = nameOf(tactic.actor);
              const target = nameOf(tactic.target);

              return {
                league: tactic.league,
                type: "system",
                text: tactic.shieldTriggered
                  ? `🛡️ ${actor} a tenté de saboter ${target}, mais son Bouclier s'est activé !`
                  : `💣 ${actor} a saboté ${target} : 0 point sur ce match !`,
                meta: { kind: tactic.shieldTriggered ? "bouclier" : "sabotage", tactic: tactic._id },
              };
            });

            Promise.all([Message.insertMany(messages), ...tacticSaves])
              // Then: a finished week gets its recap in each league's chat (only once, see weeklyRecap.ts),
              // finished seasons close (seasons.ts) and last month's #1 of the public league wins (monthlyPrize.ts)
              .then(() => Promise.all([postWeeklyRecaps(), finishSeasons(), awardMonthlyPrize()]))
              .then(([recaps, seasonsClosed, monthlyWinners]) => {
                res.json({ result: true, scored: predictions.length, recaps, seasonsClosed, monthlyWinners });
              });
          });
        });
      });
    });
  });
});

// POST /admin/make-admin — turns an account into an admin account (or back, with isAdmin: false).
// Called once by hand with the secret: the admins then do the rest from the app
router.post("/make-admin", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  if (!checkBody(req.body, ["email"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const makeAdmin = req.body.isAdmin !== false;

  User.findOneAndUpdate(
    { email: String(req.body.email).trim() },
    { isAdmin: makeAdmin },
    { returnDocument: "after" }
  ).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    res.json({ result: true, username: user.username, isAdmin: user.isAdmin });
  });
});

// The admin account behind a token — null when the token isn't an admin's
function findAdminUser(token: unknown) {
  return User.findOne({ token: String(token), isAdmin: true });
}

// What the admin screen shows about a player
function vipInfo(user: InstanceType<typeof User>) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    isVip: isVip(user),
    vipUntil: user.vipUntil,
  };
}

// GET /admin/users/:token?search= — the players whose username or email contains the search (admin screen)
router.get("/users/:token", (req, res) => {
  findAdminUser(req.params.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    const search = String(req.query.search ?? "").trim();

    if (search.length < 2) {
      res.json({ result: true, users: [] });
      return;
    }

    // Escaped: a "." or a "+" typed in the search box is a plain character, not a regex rule
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    User.find({ $or: [{ username: pattern }, { email: pattern }] })
      .sort({ username: 1 })
      .limit(20)
      .then((users) => {
        res.json({ result: true, users: users.map(vipInfo) });
      });
  });
});

// PUT /admin/vip — gives a player some months of VIP pass (added to what's left), or takes it away (months: 0)
router.put("/vip", (req, res) => {
  if (!checkBody(req.body, ["token", "userId"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const months = Number(req.body.months);

  if (!mongoose.isValidObjectId(req.body.userId) || !Number.isInteger(months) || months < 0 || months > 24) {
    res.json({ result: false, error: "Invalid id or months" });
    return;
  }

  findAdminUser(req.body.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    User.findById(req.body.userId).then((user) => {
      if (!user) {
        res.json({ result: false, error: "User not found" });
        return;
      }

      user.vipUntil = months === 0 ? null : extendVip(user.vipUntil, months);

      user.save().then((savedUser) => {
        res.json({ result: true, user: vipInfo(savedUser) });
      });
    });
  });
});

// POST /admin/import — the admin screen's button: same import as /admin/sync-events, with an admin's token
router.post("/import", (req, res) => {
  findAdminUser(req.body.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    sendImport(res);
  });
});

export default router;
