import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { buildRanking } from "../modules/ranking";
import { getSeasonPoints, getWeekPoints } from "../modules/leaguePoints";

const router = express.Router();

// POST /predictions — create or update my prediction for one event
router.post("/", (req, res) => {
  if (!checkBody(req.body, ["token", "gridId", "eventId", "payload"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!mongoose.isValidObjectId(req.body.gridId) || !mongoose.isValidObjectId(req.body.eventId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Event.findById(req.body.eventId).then((event) => {
      if (!event) {
        res.json({ result: false, error: "Event not found" });
        return;
      }

      if (!event.lockAt || event.lockAt <= new Date()) {
        res.json({ result: false, error: "Predictions are closed for this event" });
        return;
      }

      Prediction.findOneAndUpdate(
        { user: user._id, event: event._id },
        { grid: req.body.gridId, payload: req.body.payload },
        { upsert: true, returnDocument: "after" }
      ).then((prediction) => {
        res.json({ result: true, prediction });
      });
    });
  });
});

// GET /predictions/grid/:gridId/:token — my predictions for one grid
router.get("/grid/:gridId/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.gridId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Prediction.find({ user: user._id, grid: req.params.gridId }).then((predictions) => {
      res.json({ result: true, predictions });
    });
  });
});

// GET /predictions/results/:gridId/:token — my finished matches, my points and my rank change (screen 10)
router.get("/results/:gridId/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.gridId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Grid.findById(req.params.gridId)
      .populate<{ events: InstanceType<typeof Event>[] }>("events")
      .then((grid) => {
        if (!grid || !grid.league) {
          res.json({ result: false, error: "Grid not found" });
          return;
        }

        League.findById(grid.league).then((league) => {
          if (!league || !league.members.some((member) => member.user?.equals(user._id))) {
            res.json({ result: false, error: "Not a member of this league" });
            return;
          }

          Promise.all([
            Prediction.find({ user: user._id, grid: grid._id }),
            getWeekPoints(league._id),
            User.find({ _id: { $in: league.members.map((member) => member.user) } }),
          ]).then(([predictions, weekPoints, users]) => {
            // Each finished match of the grid, with what I predicted and what it gave me
            const results = grid.events
              .filter((event) => event.status === "finished")
              .map((event) => {
                const prediction = predictions.find((item) => item.event?.equals(event._id));

                return {
                  event,
                  payload: prediction?.payload ?? null,
                  bonus: prediction?.bonus ?? null,
                  points: prediction?.points ?? null,
                  sabotaged: Boolean(prediction?.sabotagedBy),
                  shieldTriggered: prediction?.shieldTriggered ?? false,
                };
              });

            // Rank before this week = the season total minus this week's points
            const members = users.map((member) => ({ userId: String(member._id), username: member.username }));
            const seasonPoints = getSeasonPoints(league);
            const pointsBefore: Record<string, number> = {};
            Object.keys(seasonPoints).forEach((userId) => {
              pointsBefore[userId] = seasonPoints[userId] - (weekPoints[userId] ?? 0);
            });

            const rankingNow = buildRanking(members, seasonPoints);
            const rankingBefore = buildRanking(members, pointsBefore);
            const myId = String(user._id);
            const rankNow = rankingNow.find((row) => row.userId === myId)?.rank ?? 1;
            const rankBefore = rankingBefore.find((row) => row.userId === myId)?.rank ?? 1;

            // The players who were ahead of me before this week and are now behind me
            const passed = rankingBefore
              .filter((row) => row.userId !== myId && row.rank < rankBefore)
              .filter((row) => (rankingNow.find((now) => now.userId === row.userId)?.rank ?? 0) > rankNow)
              .map((row) => row.username);

            res.json({
              result: true,
              leagueName: league.name,
              results,
              weekPoints: weekPoints[myId] ?? 0,
              rankBefore,
              rankNow,
              passed,
            });
          });
        });
      });
  });
});

export default router;
