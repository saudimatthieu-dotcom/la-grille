import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import User from "../models/users";
import { getWeek } from "../modules/getWeek";

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

      const season = new Date().getFullYear();
      const week = getWeek(new Date());

      Grid.findOne({ league: league._id, season, week })
        .populate("events")
        .then((grid) => {
          if (grid) {
            res.json({ result: true, grid });
            return;
          }

          Event.find({ startsAt: { $gt: new Date() } })
            .sort({ startsAt: 1 })
            .limit(10)
            .then((events) => {
              if (events.length === 0) {
                res.json({ result: false, error: "No upcoming events" });
                return;
              }

              const newGrid = new Grid({
                league: league._id,
                season,
                week,
                events: events.map((event) => event._id),
                lockAt: events[0].lockAt,
              });

              newGrid.save().then((savedGrid) => {
                savedGrid.populate("events").then((populatedGrid) => {
                  res.json({ result: true, grid: populatedGrid });
                });
              });
            });
        });
    });
  });
});

export default router;
