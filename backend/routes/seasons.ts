import express from "express";
import mongoose from "mongoose";

import League from "../models/leagues";
import Message from "../models/messages";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getMonday } from "../modules/getWeek";
import { isVip } from "../modules/vip";
import { findPlayerLeague } from "../modules/publicLeague";
import {
  MAX_SEASON_WEEKS,
  MIN_SEASON_WEEKS,
  seasonEndsAt,
  seasonLength,
  seasonState,
  seasonWeekIndex,
} from "../modules/seasons";

// The season of a private league: its banner, and starting the next one — mounted on /leagues (app.ts)
const router = express.Router();

// What the season banner shows: which season, which week, when it ends, and whether I can start the next one
function seasonInfo(league: InstanceType<typeof League>, user: InstanceType<typeof User>) {
  const isOwner = Boolean(league.owner?.equals(user._id));

  return {
    isPublic: Boolean(league.isPublic),
    number: league.seasonNumber,
    weeks: league.seasonWeeks,
    weekIndex: seasonWeekIndex(league),
    endsAt: seasonEndsAt(league),
    state: seasonState(league),
    isOwner,
    // A VIP creator chooses the next season's length
    canChooseLength: isOwner && isVip(user),
    lastPodium: league.pastSeasons[league.pastSeasons.length - 1]?.podium ?? [],
  };
}

// GET /leagues/:leagueId/season/:token — the league's season (private leagues; null for the public league)
router.get("/:leagueId/season/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.leagueId)) {
    res.json({ result: false, error: "Invalid league id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    findPlayerLeague(req.params.leagueId, user._id).then((league) => {
      if (!league) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      res.json({ result: true, season: league.isPublic ? null : seasonInfo(league, user) });
    });
  });
});

// POST /leagues/:leagueId/restart — the creator starts the next season once the last one is closed
router.post("/:leagueId/restart", (req, res) => {
  if (!checkBody(req.body, ["token"]) || !mongoose.isValidObjectId(req.params.leagueId)) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    League.findById(req.params.leagueId).then((league) => {
      if (!league || league.isPublic) {
        res.json({ result: false, error: "League not found" });
        return;
      }

      if (!league.owner?.equals(user._id)) {
        res.json({ result: false, error: "Only the league's creator can start the next season" });
        return;
      }

      if (league.seasonStatus !== "finished") {
        res.json({ result: false, error: "The season isn't over yet" });
        return;
      }

      const seasonWeeks = seasonLength(req.body.seasonWeeks, isVip(user));

      if (seasonWeeks === null) {
        res.json({ result: false, error: `A season lasts ${MIN_SEASON_WEEKS} to ${MAX_SEASON_WEEKS} weeks` });
        return;
      }

      // Starts this week: everyone at 0 (the points were reset when the last season closed)
      league.seasonNumber = (league.seasonNumber ?? 1) + 1;
      league.seasonWeeks = seasonWeeks;
      league.seasonStartsAt = getMonday(new Date());
      league.seasonStatus = "running";

      const endsAt = seasonEndsAt(league) as Date;
      const lastDay = new Date(endsAt.getTime() - 1).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

      league.save().then((savedLeague) => {
        new Message({
          league: savedLeague._id,
          type: "system",
          text: `🔄 La saison ${savedLeague.seasonNumber} est lancée : ${seasonWeeks} semaines, jusqu'au ${lastDay}. Tout le monde repart de 0 !`,
          meta: { kind: "season", number: savedLeague.seasonNumber },
        }).save();

        res.json({ result: true, season: seasonInfo(savedLeague, user) });
      });
    });
  });
});

export default router;
