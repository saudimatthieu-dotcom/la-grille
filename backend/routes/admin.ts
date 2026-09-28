import express from "express";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import { scorePrediction } from "../modules/scoring";

const router = express.Router();

// POST /admin/score — gives points to every prediction of a finished event, once
router.post("/score", (req, res) => {
  if (!process.env.ADMIN_SECRET || req.body.secret !== process.env.ADMIN_SECRET) {
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

          const points = scorePrediction(event.sport, prediction.payload, event.result, event.ouLine ?? 0);

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
