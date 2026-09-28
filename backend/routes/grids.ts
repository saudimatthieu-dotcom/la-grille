import express from "express";
import mongoose from "mongoose";

import League from "../models/leagues";
import Prediction from "../models/predictions";
import User from "../models/users";
import { getCurrentGrid } from "../modules/currentGrid";

const router = express.Router();

// GET /grids/league/:leagueId/current/:token — this week's grid (created on first visit)
router.get("/league/:leagueId/current/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.leagueId)) {
    res.json({ result: false, error: "Invalid league id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    League.findById(req.params.leagueId).then((league) => {
      if (!league) {
        res.json({ result: false, error: "League not found" });
        return;
      }

      const isMember = league.members.some((member) => member.user?.equals(user._id));

      if (!isMember) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      getCurrentGrid(league._id).then((grid) => {
        if (!grid) {
          res.json({ result: false, error: "No upcoming events" });
          return;
        }

        res.json({ result: true, grid });
      });
    });
  });
});

// GET /grids/mine/:token — this week's grid of each of my leagues, with my progress (Grille tab)
router.get("/mine/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    League.find({ "members.user": user._id }).then((leagues) => {
      Promise.all(leagues.map((league) => getCurrentGrid(league._id))).then((grids) => {
        const gridIds = grids.filter((grid) => grid !== null).map((grid) => grid._id);

        Prediction.find({ user: user._id, grid: { $in: gridIds } }).then((predictions) => {
          const now = new Date();

          const myGrids = leagues.map((league, index) => {
            const grid = grids[index];

            if (!grid) {
              return { leagueId: league._id, leagueName: league.name, grid: null };
            }

            const filled = predictions.filter((prediction) => prediction.grid?.equals(grid._id)).length;
            // Matches still open for predictions
            const open = grid.events.filter((event) => event.lockAt && event.lockAt > now).length;
            const nextLockAt = grid.events
              .map((event) => event.lockAt)
              .filter((lockAt) => lockAt && lockAt > now)
              .sort((a, b) => Number(a) - Number(b))[0];

            return {
              leagueId: league._id,
              leagueName: league.name,
              grid: { _id: grid._id, total: grid.events.length, filled, open, nextLockAt: nextLockAt ?? null },
            };
          });

          res.json({ result: true, grids: myGrids });
        });
      });
    });
  });
});

export default router;
