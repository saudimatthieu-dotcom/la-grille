import express from "express";

import Event from "../models/events";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { tacticsOf } from "../modules/leaguePoints";
import { getPublicLeague } from "../modules/publicLeague";
import { pointsInLeague, scorePrediction } from "../modules/scoring";
import { postWeeklyRecaps } from "../modules/weeklyRecap";
import type { Result } from "../modules/scoring";
import { THESPORTSDB_COMPETITIONS } from "../config/competitions";
import { fetchUpcomingEvents, fetchEventResult } from "../providers/thesportsdb";
import { fetchNextRace, fetchRacePodium } from "../providers/jolpica";

const router = express.Router();

// Admin routes are called by cron-job.org with the secret from .env
function isAdmin(secret: unknown) {
  return Boolean(process.env.ADMIN_SECRET) && secret === process.env.ADMIN_SECRET;
}

// POST /admin/sync-events — imports the upcoming events from the sports APIs
router.post("/sync-events", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  const requests = [
    ...THESPORTSDB_COMPETITIONS.map((competition) => fetchUpcomingEvents(competition)),
    fetchNextRace().then((race) => (race ? [race] : [])),
  ];

  Promise.all(requests)
    .then((lists) => {
      const events = lists.flat();

      // upsert on { provider, externalId }: a new match is created, a known one is updated (e.g. rescheduled)
      const saves = events.map((event) =>
        Event.updateOne({ provider: event.provider, externalId: event.externalId }, event, { upsert: true })
      );

      return Promise.all(saves).then(() => {
        res.json({ result: true, imported: events.length });
      });
    })
    .catch(() => res.json({ result: false, error: "Sports API unavailable" }));
});

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
              // Last: a finished week gets its recap in each league's chat (only once, see weeklyRecap.ts)
              .then(() => postWeeklyRecaps())
              .then((recaps) => {
                res.json({ result: true, scored: predictions.length, recaps });
              });
          });
        });
      });
    });
  });
});

export default router;
