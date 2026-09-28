import express from "express";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import { applyTactics, scorePrediction } from "../modules/scoring";
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
      const gridIds = predictions.map((prediction) => prediction.grid);

      Grid.find({ _id: { $in: gridIds } }).then((grids) => {
        const updates = predictions.map((prediction) => {
          const event = events.find((item) => prediction.event && item._id.equals(prediction.event));
          const grid = grids.find((item) => prediction.grid && item._id.equals(prediction.grid));

          if (!event || !grid) {
            return Promise.resolve();
          }

          const rawPoints = scorePrediction(event.sport, prediction.payload, event.result, event.ouLine ?? 0);
          const isSabotaged = Boolean(prediction.sabotagedBy);
          const points = applyTactics(rawPoints, event.sport, prediction.bonus ?? {}, isSabotaged);

          // Remembered for the chat log: "his Bouclier blocked the attack!"
          prediction.shieldTriggered = isSabotaged && Boolean(prediction.bonus?.bouclier);

          prediction.points = points;
          prediction.scoredAt = new Date();

          // Save the prediction, then add its points to the player's total in the league
          return prediction.save().then(() =>
            League.updateOne(
              { _id: grid.league, "members.user": prediction.user },
              { $inc: { "members.$.points": points } }
            )
          );
        });

        Promise.all(updates).then(() => {
          res.json({ result: true, scored: predictions.length });
        });
      });
    });
  });
});

export default router;
