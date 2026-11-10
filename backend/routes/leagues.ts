import express from "express";
import uid2 from "uid2";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { findBannedWord } from "../modules/moderation";
import { PRIVATE_CATEGORIES } from "../config/bannedWords";
import { getMonday, getSeason, getWeek } from "../modules/getWeek";
import { leagueEvents } from "../modules/selections";
import { FREE_LEAGUE_MAX_MEMBERS, isVip } from "../modules/vip";
import { MAX_SEASON_WEEKS, MIN_SEASON_WEEKS, seasonLength } from "../modules/seasons";
import { getWeekPoints } from "../modules/leaguePoints";

const router = express.Router();

// POST /leagues — create
router.post("/", (req, res) => {
  if (!checkBody(req.body, ["token", "name", "gridType"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const gridTypes = ["officielle", "classique", "exotique", "surmesure"];

  if (!gridTypes.includes(req.body.gridType)) {
    res.json({ result: false, error: "Invalid grid type" });
    return;
  }

  // A private league's name: only its members see it, so the friends' chambrage rules apply
  if (findBannedWord(String(req.body.name), PRIVATE_CATEGORIES)) {
    res.json({ result: false, error: "League name contains forbidden words" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    // Sur-mesure: the owner picks the matches every week — a VIP feature
    if (req.body.gridType === "surmesure" && !isVip(user)) {
      res.json({ result: false, error: "The sur-mesure grid is for VIP members" });
      return;
    }

    // 10 weeks — a VIP creator chooses 4 to 30
    const seasonWeeks = seasonLength(req.body.seasonWeeks, isVip(user));

    if (seasonWeeks === null) {
      res.json({ result: false, error: `A season lasts ${MIN_SEASON_WEEKS} to ${MAX_SEASON_WEEKS} weeks` });
      return;
    }

    const newLeague = new League({
      name: req.body.name,
      code: uid2(6).toUpperCase(),
      gridType: req.body.gridType,
      owner: user._id,
      members: [{ user: user._id }],
      // The first season starts this week
      seasonWeeks,
      seasonStartsAt: getMonday(new Date()),
    });

    newLeague.save().then((newDoc) => {
      res.json({ result: true, league: newDoc });
    });
  });
});

// POST /leagues/join — join
router.post("/join", (req, res) => {
  if (!checkBody(req.body, ["token", "code"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    League.findOne({ code: req.body.code.toUpperCase() }).then((league) => {
      if (!league) {
        res.json({ result: false, error: "Invalid code" });
        return;
      }

      const isMember = league.members.some((member) => member.user?.equals(user._id));

      if (isMember) {
        res.json({ result: false, error: "Already a member of this league" });
        return;
      }

      // Full: a private league whose owner isn't VIP stops at FREE_LEAGUE_MAX_MEMBERS players
      User.findById(league.owner).then((owner) => {
        const isFull =
          !league.isPublic && league.members.length >= FREE_LEAGUE_MAX_MEMBERS && !(owner && isVip(owner));

        if (isFull) {
          res.json({ result: false, error: "This league is full" });
          return;
        }

        league.members.push({ user: user._id });

        league.save().then((updatedLeague) => {
          res.json({ result: true, league: updatedLeague });
        });
      });
    });
  });
});

// GET /leagues/user/:token — my leagues
router.get("/user/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    League.find({ "members.user": user._id }).then((leagues) => {
      // This week's grid (read only: it is created when a player opens it), with each event's sport and
      // competition: a league only counts the matches of its grid type
      Grid.findOne({ season: getSeason(new Date()), week: getWeek(new Date()) })
        .populate<{ events: InstanceType<typeof Event>[] }>("events", "sport competition")
        .then((grid) => {
        Promise.all([
          // How many matches I predicted in each league: every league has its own predictions
          Promise.all(
            leagues.map((league) =>
              grid
                ? Prediction.countDocuments({ user: user._id, grid: grid._id, league: league._id })
                : Promise.resolve(0)
            )
          ),
          Promise.all(leagues.map((league) => getWeekPoints(league))),
          // The matches each league plays this week: picked by hand, or the ones of its type
          Promise.all(leagues.map((league) => (grid ? leagueEvents(league, grid) : Promise.resolve(null)))),
        ]).then(([filledByLeague, weekPointsByLeague, eventsByLeague]) => {
          // Adds my rank, my points and my progress to each league (home screen + Mes Ligues)
          const myLeagues = leagues.map((league, index) => {
            const me = league.members.find((member) => member.user?.equals(user._id));
            const myPoints = me?.points ?? 0;
            const myRank = league.members.filter((member) => member.points > myPoints).length + 1;

            return {
              ...league.toObject(),
              myPoints,
              myRank,
              myWeekPoints: weekPointsByLeague[index][String(user._id)] ?? 0,
              filled: filledByLeague[index],
              total: eventsByLeague[index]?.length ?? null,
            };
          });

          res.json({ result: true, leagues: myLeagues });
        });
      });
    });
  });
});

export default router;
