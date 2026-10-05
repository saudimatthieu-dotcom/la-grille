import express from "express";

import Event from "../models/events";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { tacticsOf } from "../modules/leaguePoints";
import { pointsInLeague, scorePrediction } from "../modules/scoring";
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
      const playerIds = predictions.map((prediction) => prediction.user);

      Promise.all([
        League.find({ "members.user": { $in: playerIds } }),
        // Bonuses and sabotages on these predictions, in every league
        Tactic.find({ prediction: { $in: predictionIds } }),
      ]).then(([leagues, tactics]) => {
        const sabotages = tactics.filter((tactic) => tactic.kind === "sabotage");

        const updates = predictions.map((prediction) => {
          const event = events.find((item) => prediction.event && item._id.equals(prediction.event));

          if (!event) {
            return Promise.resolve();
          }

          // The raw points, without any bonus: the general ranking and the public league
          const points = scorePrediction(event.sport, prediction.payload, event.result, event.ouLine ?? 0);

          prediction.points = points;
          prediction.scoredAt = new Date();

          // Each league of the player adds its own bonus and sabotage: a doubleur in one league doubles only there
          const leagueUpdates = leagues
            .filter((league) => league.members.some((member) => member.user?.equals(prediction.user)))
            .map((league) => {
              const tacticsHere = tactics.filter((tactic) => tactic.league?.equals(league._id));
              const { bonus, sabotage } = tacticsOf(tacticsHere, prediction._id);

              return League.updateOne(
                { _id: league._id, "members.user": prediction.user },
                { $inc: { "members.$.points": pointsInLeague(points, event.sport, bonus, Boolean(sabotage)) } }
              );
            });

          return prediction
            .save()
            .then(() => Promise.all([User.updateOne({ _id: prediction.user }, { $inc: { points } }), ...leagueUpdates]));
        });

        Promise.all(updates).then(() => {
          // Every sabotage scored in this run gets its line in the chat of its league
          const userIds = sabotages.flatMap((tactic) => [tactic.actor, tactic.target]);

          User.find({ _id: { $in: userIds } }).then((users) => {
            const nameOf = (id: unknown) => users.find((user) => user._id.equals(String(id)))?.username ?? "?";

            // Remembered for the results screen: "his Bouclier blocked the attack!"
            const tacticSaves = sabotages.map((tactic) => {
              // The target's bouclier on this prediction, in the league of the sabotage
              const tacticsHere = tactics.filter((other) => String(other.league) === String(tactic.league));
              const target = predictions.find((item) => tactic.prediction?.equals(item._id));
              tactic.shieldTriggered = Boolean(tacticsOf(tacticsHere, target?._id).bonus.bouclier);
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

            Promise.all([Message.insertMany(messages), ...tacticSaves]).then(() => {
              res.json({ result: true, scored: predictions.length });
            });
          });
        });
      });
    });
  });
});

export default router;
