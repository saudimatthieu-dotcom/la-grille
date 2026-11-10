import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import Prediction from "../models/predictions";
import User from "../models/users";
import { getSeason, getWeek } from "../modules/getWeek";
import { buildRanking } from "../modules/ranking";
import { findTactics, getSeasonPoints, getWeekPoints, tacticsOf } from "../modules/leaguePoints";
import { isPlayed } from "../modules/gridTypes";
import { findPicked } from "../modules/selections";
import { findPlayerLeague } from "../modules/publicLeague";
import { pointsInLeague } from "../modules/scoring";

// My results for one grid (Résultats page) — mounted on /predictions (app.ts)
const router = express.Router();

// GET /predictions/results/:gridId/:token?leagueId= — my finished matches and my points in one league (screen 10)
// No leagueId: the public league (the Grille tab) — its raw points are the general ranking
router.get("/results/:gridId/:token", (req, res) => {
  const leagueId = req.query.leagueId;

  if (!mongoose.isValidObjectId(req.params.gridId) || (leagueId && !mongoose.isValidObjectId(leagueId))) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Promise.all([
      Grid.findById(req.params.gridId).populate<{ events: InstanceType<typeof Event>[] }>("events"),
      findPlayerLeague(leagueId, user._id),
    ]).then(([grid, league]) => {
      if (!grid) {
        res.json({ result: false, error: "Grid not found" });
        return;
      }

      if (!league) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      // An old week (opened from the Semaine tab's arrows) or this one
      const season = grid.season ?? 0;
      const week = grid.week ?? 0;
      const isThisWeek = season === getSeason(new Date()) && week === getWeek(new Date());

      Prediction.find({ user: user._id, grid: grid._id, league: league._id }).then((predictions) => {
        Promise.all([
          findTactics(
            league._id,
            predictions.map((prediction) => prediction._id)
          ),
          getWeekPoints(league, season, week),
          User.find({ _id: { $in: league.members.map((member) => member.user) } }),
          findPicked(league, season, week),
        ]).then(([tactics, weekPoints, users, picked]) => {
          // Each finished match of this league's grid, with what I predicted there and what it gave me
          const results = grid.events
            .filter((event) => event.status === "finished" && isPlayed(event, picked))
            .map((event) => {
              const prediction = predictions.find((item) => item.event?.equals(event._id));
              const { bonus, sabotage } = tacticsOf(tactics, prediction?._id);
              const rawPoints = prediction?.points ?? null;

              return {
                event,
                payload: prediction?.payload ?? null,
                bonus,
                points: rawPoints === null ? null : pointsInLeague(rawPoints, event.sport, bonus, Boolean(sabotage)),
                sabotaged: Boolean(sabotage),
                shieldTriggered: sabotage?.shieldTriggered ?? false,
              };
            });

          const myId = String(user._id);

          // An old week: no rank move — "before → after" that week would need every week played since
          if (!isThisWeek) {
            res.json({
              result: true,
              leagueName: league.name,
              season,
              week,
              isThisWeek,
              results,
              weekPoints: weekPoints[myId] ?? 0,
              rankBefore: null,
              rankNow: null,
              passed: [],
            });
            return;
          }

          // Rank before this week = the season total minus this week's points
          const members = users.map((member) => ({ userId: String(member._id), username: member.username }));
          const seasonPoints = getSeasonPoints(league);
          const pointsBefore: Record<string, number> = {};
          Object.keys(seasonPoints).forEach((userId) => {
            pointsBefore[userId] = seasonPoints[userId] - (weekPoints[userId] ?? 0);
          });

          const rankingNow = buildRanking(members, seasonPoints);
          const rankingBefore = buildRanking(members, pointsBefore);
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
            season,
            week,
            isThisWeek,
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
