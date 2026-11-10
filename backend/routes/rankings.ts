import express from "express";
import mongoose from "mongoose";

import Grid from "../models/grids";
import League from "../models/leagues";
import User from "../models/users";
import { getSeason, getWeek } from "../modules/getWeek";
import { getMonthPoints, monthKey } from "../modules/monthlyPrize";
import { buildRanking } from "../modules/ranking";
import { getSeasonPoints, getWeekPoints } from "../modules/leaguePoints";

// The ranking of a league (Classement tab) — mounted on /leagues (app.ts)
const router = express.Router();

// The closest week before (or after) this one that has a grid — null when there is none
function findOtherWeek(season: number, week: number, direction: "previous" | "next") {
  const filter =
    direction === "previous"
      ? { $or: [{ season, week: { $lt: week } }, { season: { $lt: season } }] }
      : { $or: [{ season, week: { $gt: week } }, { season: { $gt: season } }] };
  const order = direction === "previous" ? -1 : 1;

  return Grid.findOne(filter)
    .sort({ season: order, week: order })
    .then((grid) => (grid ? { season: grid.season, week: grid.week } : null));
}

// GET /leagues/:leagueId/ranking/:token?scope=week|season&season=2026&week=39 — league ranking (screen 8)
router.get("/:leagueId/ranking/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.leagueId)) {
    res.json({ result: false, error: "Invalid league id" });
    return;
  }

  // "month": the public league's month ranking (its monthly prize) — "season": the league's season (the public
  // league's never resets: it's the general ranking)
  const scope = req.query.scope === "week" || req.query.scope === "month" ? req.query.scope : "season";

  // The week to rank: this week by default, or an older one with ?season=…&week=… (Semaine tab only)
  const now = new Date();
  const thisSeason = getSeason(now);
  const thisWeek = getWeek(now);
  const season = (scope === "week" && Number(req.query.season)) || thisSeason;
  const week = (scope === "week" && Number(req.query.week)) || thisWeek;

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

      const memberIds = league.members.map((member) => member.user);

      User.find({ _id: { $in: memberIds } }).then((users) => {
        const members = users.map((member) => ({
          userId: String(member._id),
          username: member.username,
          avatar: member.avatar,
        }));

        Promise.all([
          getWeekPoints(league, season, week),
          Grid.findOne({ season, week }),
          findOtherWeek(season, week, "previous"),
          findOtherWeek(season, week, "next"),
          // This calendar month's points: only the public league has a month ranking
          scope === "month" && league.isPublic
            ? getMonthPoints(league, monthKey(now)).then((data) => data.pointsByUser)
            : Promise.resolve(null),
        ]).then(([weekPoints, grid, previous, next, monthPoints]) => {
          let points = scope === "week" ? weekPoints : getSeasonPoints(league);

          if (monthPoints) {
            points = monthPoints;
          }

          // weekPoints on every row: the "+3 this week" shown next to the season total
          const ranking = buildRanking(members, points).map((row) => ({
            ...row,
            weekPoints: weekPoints[row.userId] ?? 0,
          }));

          res.json({
            result: true,
            scope,
            ranking,
            // The public league has no Chat tab and no sabotage
            isPublic: Boolean(league.isPublic),
            // The Semaine tab's arrows: which week this is, its grid (to open my results) and its neighbours
            season,
            week,
            isThisWeek: season === thisSeason && week === thisWeek,
            gridId: grid?._id ?? null,
            previous,
            next,
            // The palmarès: the podiums of past seasons, or the public league's monthly winners
            pastSeasons: league.pastSeasons,
            monthlyWinners: league.monthlyWinners,
          });
        });
      });
    });
  });
});

export default router;
