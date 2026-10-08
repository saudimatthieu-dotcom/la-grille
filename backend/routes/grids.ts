import express from "express";
import mongoose from "mongoose";

import User from "../models/users";
import { getCurrentGrid } from "../modules/currentGrid";
import { findPlayerLeague } from "../modules/publicLeague";
import { leagueEvents } from "../modules/selections";
import { isVip } from "../modules/vip";

const router = express.Router();

// GET /grids/current/:token?leagueId= — this week's grid, as one league plays it (none: the public league)
// The grid holds every match of the week: each league only sees the ones picked for it, or else the ones of its type
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

      // The VIP owner of a sur-mesure league picks its matches: the grid shows them the button (even when empty)
      const canPick = league.gridType === "surmesure" && Boolean(league.owner?.equals(user._id)) && isVip(user);

      if (!grid) {
        res.json({ result: false, error: "No upcoming events", canPick });
        return;
      }

      // The matches picked by hand for this league's grid this week, or else the ones of its type
      leagueEvents(league, grid).then((events) => {
        if (events.length === 0) {
          res.json({ result: false, error: "No match for this grid this week", canPick });
          return;
        }

        res.json({ result: true, grid: { ...grid.toObject(), events }, canPick });
      });
    });
  });
});

export default router;
