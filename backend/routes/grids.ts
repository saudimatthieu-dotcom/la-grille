import express from "express";
import mongoose from "mongoose";

import User from "../models/users";
import { getCurrentGrid } from "../modules/currentGrid";
import { isInGrid } from "../modules/gridTypes";
import { findPlayerLeague } from "../modules/publicLeague";

const router = express.Router();

// GET /grids/current/:token?leagueId= — this week's grid, as one league plays it (none: the public league)
// The grid holds every match of the week: each league only sees the ones of its type (officielle, classique, exotique)
router.get("/current/:token", (req, res) => {
  const leagueId = req.query.leagueId;

  if (leagueId && !mongoose.isValidObjectId(leagueId)) {
    res.json({ result: false, error: "Invalid league id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Promise.all([getCurrentGrid(), findPlayerLeague(leagueId, user._id)]).then(([grid, league]) => {
      if (!league) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      if (!grid) {
        res.json({ result: false, error: "No upcoming events" });
        return;
      }

      const events = grid.events.filter((event) => isInGrid(league.gridType, event));

      if (events.length === 0) {
        res.json({ result: false, error: "No match for this grid this week" });
        return;
      }

      res.json({ result: true, grid: { ...grid.toObject(), events } });
    });
  });
});

export default router;
