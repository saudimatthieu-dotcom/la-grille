import express from "express";

import Event from "../models/events";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { findAdminUser, isAdmin } from "../modules/adminAuth";
import { checkBody } from "../modules/checkBody";
import { tacticsOf } from "../modules/leaguePoints";
import { getPublicLeague } from "../modules/publicLeague";
import { pointsInLeague, scorePrediction } from "../modules/scoring";
import { postWeeklyRecaps } from "../modules/weeklyRecap";
import { finishSeasons } from "../modules/seasons";
import { awardMonthlyPrize } from "../modules/monthlyPrize";
import type { Result } from "../modules/scoring";
import { fetchEventResult } from "../providers/thesportsdb";
import { fetchRacePodium } from "../providers/jolpica";
import { getImportStatus, IMPORT_DAYS, startImport } from "../modules/importEvents";
import { NOTIFICATION_TEXTS, sendPush } from "../modules/sendPush";
import type { NotificationKind } from "../modules/sendPush";
import { notifyClosingSoon, notifyNewGrid, notifyResults } from "../modules/gamePush";

const router = express.Router();

// POST /admin/sync-events — imports the matches of the coming month from the sports APIs (cron-job.org)
router.post("/sync-events", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  sendImport(res);
});

// Starts the import and answers at once: it runs in the background (15 minutes or more on the free key).
// GET /admin/import/:token tells how it is going
function sendImport(res: express.Response) {
  if (!startImport()) {
    res.json({ result: false, error: "An import is already running", status: getImportStatus() });
    return;
  }

  res.json({ result: true, started: true, days: IMPORT_DAYS, status: getImportStatus() });
}

// At most this many matches per call: TheSportsDB's free key allows 30 calls a minute (2.1 s pause before each),
// and cron-job.org waits 30 s for the answer → 12 × 2.1 s ≈ 25 s. Called every hour: 288 matches a day
const RESULTS_PER_CALL = 12;
// A match is looked up 2 h after kick-off: before that it's still being played
const MATCH_LENGTH_MS = 2 * 60 * 60 * 1000;

function fetchResult(event: InstanceType<typeof Event>): Promise<Result | null> {
  const externalId = event.externalId ?? "";

  if (event.provider === "thesportsdb") {
    return fetchEventResult(externalId);
  }

  if (event.provider === "jolpica") {
    return fetchRacePodium(externalId);
  }

  return Promise.resolve(null);
}

// POST /admin/sync-results — fetches the final result of the matches that should be over (cron-job.org, every hour).
// Answers how many were checked, finished, failed, and how many are still waiting
router.post("/sync-results", async (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  const filter = { status: "scheduled" as const, startsAt: { $lt: new Date(Date.now() - MATCH_LENGTH_MS) } };

  try {
    // Newest first: an old match that never gets a result (postponed…) never blocks the others
    const events = await Event.find(filter).sort({ startsAt: -1 }).limit(RESULTS_PER_CALL);
    let finished = 0;
    let failed = 0;

    // One after the other, never all at once: the API refuses bursts
    for (const event of events) {
      try {
        const result = await fetchResult(event);

        if (result) {
          event.status = "finished";
          event.result = result;
          await event.save();
          finished++;
        }
        // null: not finished yet, we'll try again at the next call
      } catch (error) {
        // One failed match doesn't stop the others
        console.log("sync-results:", event.provider, event.externalId, String(error));
        failed++;
      }
    }

    const waiting = await Event.countDocuments(filter);

    // Every call failed: the API itself is down (or the key is dead) — cron-job.org should show it
    if (events.length > 0 && failed === events.length) {
      res.json({ result: false, error: "Sports API unavailable", waiting });
      return;
    }

    res.json({ result: true, checked: events.length, finished, failed, waiting });
  } catch {
    res.json({ result: false, error: "Database unavailable" });
  }
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
              .then(([recapGrids, seasonsClosed, monthlyWinners]) =>
                // The weeks closed just now: their players get the "results" notification (a push failure doesn't fail the scoring)
                notifyResults(recapGrids)
                  .catch(() => 0)
                  .then((resultsPushed) => {
                    res.json({
                      result: true,
                      scored: predictions.length,
                      recaps: recapGrids.length,
                      seasonsClosed,
                      monthlyWinners,
                      resultsPushed,
                    });
                  })
              );
          });
        });
      });
    });
  });
});

// POST /admin/notify — the "new grid" and "closing soon" notifications (cron-job.org, every hour).
// Safe to call as often as wanted: each one reaches a player once per week (modules/gamePush.ts)
router.post("/notify", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  Promise.all([notifyNewGrid(), notifyClosingSoon()])
    .then(([newGrid, closingSoon]) => res.json({ result: true, newGrid, closingSoon }))
    .catch(() => res.json({ result: false, error: "Expo push service unavailable" }));
});

// POST /admin/test-push — sends one notification to one account, to check push works end to end (by hand, with the secret)
// kind: newGrid by default — nothing is sent if that account switched it off in Profil
router.post("/test-push", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  if (!checkBody(req.body, ["email"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const kind: NotificationKind = req.body.kind ?? "newGrid";

  if (!(kind in NOTIFICATION_TEXTS)) {
    res.json({ result: false, error: "Invalid notification kind" });
    return;
  }

  sendPush({ email: String(req.body.email).trim() }, kind, NOTIFICATION_TEXTS[kind])
    .then(({ sent, removed }) => res.json({ result: true, sent, removed }))
    .catch(() => res.json({ result: false, error: "Expo push service unavailable" }));
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

// GET /admin/import/:token — how the import is going (the admin screen asks every few seconds)
router.get("/import/:token", (req, res) => {
  findAdminUser(req.params.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    res.json({ result: true, status: getImportStatus() });
  });
});

export default router;
