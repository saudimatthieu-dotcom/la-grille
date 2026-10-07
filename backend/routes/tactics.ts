import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getSeason, getWeek } from "../modules/getWeek";
import { findSabotages } from "../modules/leaguePoints";
import { buildRanking } from "../modules/ranking";
import { bonusStock, findWeekBonuses } from "../modules/bonus";
import { findPlayerLeague } from "../modules/publicLeague";

const router = express.Router();

// GET /tactics/bonus/:gridId/:token?leagueId=&predictionId= — what's left of my week's bonuses in this league (BonusBar)
// The bonus already on predictionId is counted as available: saving the prediction again gives it back first
router.get("/bonus/:gridId/:token", (req, res) => {
  const { leagueId, predictionId } = req.query;

  if (
    !mongoose.isValidObjectId(req.params.gridId) ||
    (leagueId && !mongoose.isValidObjectId(leagueId)) ||
    (predictionId && !mongoose.isValidObjectId(predictionId))
  ) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Promise.all([Grid.findById(req.params.gridId), findPlayerLeague(leagueId, user._id)]).then(([grid, league]) => {
      if (!grid) {
        res.json({ result: false, error: "Grid not found" });
        return;
      }

      if (!league) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      // The public league plays without bonuses: null tells the BonusBar to say so
      if (league.isPublic) {
        res.json({ result: true, league: null });
        return;
      }

      findWeekBonuses(user._id, league._id, grid.season, grid.week).then((tactics) => {
        res.json({
          result: true,
          league: { leagueId: league._id, leagueName: league.name, stock: bonusStock(tactics, predictionId) },
        });
      });
    });
  });
});

// Checks that a user may sabotage this rival in this league this week — gives back an error, or the league + this week's grid
function checkSaboteur(leagueId: string, userId: mongoose.Types.ObjectId, targetUserId: string) {
  const season = getSeason(new Date());
  const week = getWeek(new Date());

  return League.findById(leagueId).then((league) => {
    if (!league) {
      return { error: "League not found" };
    }

    // Before the lanterne rouge check: the last of the public league must not read "only the lanterne rouge…"
    if (league.isPublic) {
      return { error: "No sabotage in the public league" };
    }

    const isMember = league.members.some((member) => member.user?.equals(userId));

    if (!isMember) {
      return { error: "Not a member of this league" };
    }

    // Without this check, a player from another league could be targeted
    const isTargetMember = league.members.some((member) => member.user?.equals(targetUserId));

    if (!isTargetMember) {
      return { error: "This player isn't in this league" };
    }

    // The lanterne rouge is the last of the season ranking
    const pointsByUser: Record<string, number> = {};
    league.members.forEach((member) => {
      pointsByUser[String(member.user)] = member.points;
    });

    const members = league.members.map((member) => ({ userId: String(member.user), username: "" }));
    const me = buildRanking(members, pointsByUser).find((row) => row.userId === String(userId));

    if (!me?.isLastPlace) {
      return { error: "Only the lanterne rouge can sabotage" };
    }

    return Tactic.findOne({ league: league._id, season, week, actor: userId, kind: "sabotage" }).then((tactic) => {
      if (tactic) {
        return { error: "Sabotage already used this week" };
      }

      // populate<...> tells TypeScript that "events" now holds full events, not just ids
      return Grid.findOne({ season, week })
        .populate<{ events: InstanceType<typeof Event>[] }>("events")
        .then((grid) => {
          if (!grid) {
            return { error: "No grid this week" };
          }

          return { league, grid, season, week };
        });
    });
  });
}

// GET /tactics/sabotage/:leagueId/:targetUserId/:token — the rival's matches I can still sabotage
router.get("/sabotage/:leagueId/:targetUserId/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.leagueId) || !mongoose.isValidObjectId(req.params.targetUserId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    checkSaboteur(req.params.leagueId, user._id, req.params.targetUserId).then((context) => {
      if ("error" in context) {
        res.json({ result: false, error: context.error });
        return;
      }

      // The rival's predictions in this league (their other leagues have their own)
      const filter = { user: req.params.targetUserId, grid: context.grid._id, league: context.league._id };

      Prediction.find(filter).then((predictions) => {
        findSabotages(
          context.league._id,
          predictions.map((prediction) => prediction._id)
        ).then((sabotages) => {
          const now = new Date();

          // A prediction already sabotaged can't be hit twice
          const targets = predictions.filter(
            (prediction) => !sabotages.some((tactic) => tactic.prediction?.equals(prediction._id))
          );

          // Only matches the rival predicted and that haven't started yet — never their prediction itself
          const events = context.grid.events.filter((event) => {
            const isPredicted = targets.some((prediction) => prediction.event?.equals(event._id));
            return isPredicted && event.lockAt && event.lockAt > now;
          });

          res.json({ result: true, events });
        });
      });
    });
  });
});

// POST /tactics/sabotage — the lanterne rouge sets a rival's prediction to 0 (unless a bouclier protects it)
router.post("/sabotage", (req, res) => {
  if (!checkBody(req.body, ["token", "leagueId", "targetUserId", "eventId"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const { leagueId, targetUserId, eventId } = req.body;

  if (![leagueId, targetUserId, eventId].every((id) => mongoose.isValidObjectId(id))) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    if (user._id.equals(targetUserId)) {
      res.json({ result: false, error: "You can't sabotage yourself" });
      return;
    }

    checkSaboteur(leagueId, user._id, targetUserId).then((context) => {
      if ("error" in context) {
        res.json({ result: false, error: context.error });
        return;
      }

      const event = context.grid.events.find((item) => item._id.equals(eventId));

      if (!event) {
        res.json({ result: false, error: "Event not in this week's grid" });
        return;
      }

      if (!event.lockAt || event.lockAt <= new Date()) {
        res.json({ result: false, error: "Predictions are closed for this event" });
        return;
      }

      Prediction.findOne({
        user: targetUserId,
        grid: context.grid._id,
        event: event._id,
        league: context.league._id,
      }).then((prediction) => {
        if (!prediction) {
          res.json({ result: false, error: "This player has no prediction on this event" });
          return;
        }

        findSabotages(context.league._id, [prediction._id]).then((sabotages) => {
          if (sabotages.length > 0) {
            res.json({ result: false, error: "Already sabotaged" });
            return;
          }

          // The prediction itself isn't touched: the sabotage is a tactic, scored with it
          const tactic = new Tactic({
            league: context.league._id,
            season: context.season,
            week: context.week,
            actor: user._id,
            target: targetUserId,
            kind: "sabotage",
            prediction: prediction._id,
          });

          // Nothing is announced now: the chat finds out when the match is scored
          tactic.save().then(() => {
            res.json({ result: true });
          });
        });
      });
    });
  });
});

export default router;
