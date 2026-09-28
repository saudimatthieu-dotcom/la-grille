import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getWeek } from "../modules/getWeek";
import { buildRanking } from "../modules/ranking";

const router = express.Router();

const BONUS_KINDS = ["doubleur", "assurance", "bouclier"];

// POST /tactics/bonus — turns a doubleur, assurance or bouclier on or off for one prediction
router.post("/bonus", (req, res) => {
  if (!checkBody(req.body, ["token", "predictionId", "kind"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!BONUS_KINDS.includes(req.body.kind)) {
    res.json({ result: false, error: "Invalid bonus" });
    return;
  }

  if (!mongoose.isValidObjectId(req.body.predictionId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  const kind: "doubleur" | "assurance" | "bouclier" = req.body.kind;

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Prediction.findById(req.body.predictionId).then((prediction) => {
      // Same message for "doesn't exist" and "not yours": gives nothing away
      if (!prediction || !prediction.user?.equals(user._id)) {
        res.json({ result: false, error: "Prediction not found" });
        return;
      }

      Event.findById(prediction.event).then((event) => {
        if (!event || !event.lockAt || event.lockAt <= new Date()) {
          res.json({ result: false, error: "Predictions are closed for this event" });
          return;
        }

        const isActive = Boolean(prediction.bonus?.[kind]);
        const stock = user.inventory?.[kind] ?? 0;

        if (!isActive && stock <= 0) {
          res.json({ result: false, error: "No bonus left" });
          return;
        }

        // On: take one from the inventory — off: give it back
        prediction.set(`bonus.${kind}`, !isActive);
        user.set(`inventory.${kind}`, isActive ? stock + 1 : stock - 1);

        Promise.all([prediction.save(), user.save()]).then(() => {
          res.json({ result: true, bonus: prediction.bonus, inventory: user.inventory });
        });
      });
    });
  });
});

// Checks that a user may sabotage in this league this week — gives back an error, or the league + this week's grid
function checkSaboteur(leagueId: string, userId: mongoose.Types.ObjectId) {
  const season = new Date().getFullYear();
  const week = getWeek(new Date());

  return League.findById(leagueId).then((league) => {
    if (!league) {
      return { error: "League not found" };
    }

    const isMember = league.members.some((member) => member.user?.equals(userId));

    if (!isMember) {
      return { error: "Not a member of this league" };
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
      return Grid.findOne({ league: league._id, season, week })
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

    checkSaboteur(req.params.leagueId, user._id).then((context) => {
      if ("error" in context) {
        res.json({ result: false, error: context.error });
        return;
      }

      Prediction.find({ user: req.params.targetUserId, grid: context.grid._id, sabotagedBy: null }).then((predictions) => {
        const now = new Date();

        // Only matches the rival predicted and that haven't started yet — never their prediction itself
        const events = context.grid.events.filter((event) => {
          const isPredicted = predictions.some((prediction) => prediction.event?.equals(event._id));
          return isPredicted && event.lockAt && event.lockAt > now;
        });

        res.json({ result: true, events });
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

    checkSaboteur(leagueId, user._id).then((context) => {
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

      Prediction.findOne({ user: targetUserId, grid: context.grid._id, event: event._id }).then((prediction) => {
        if (!prediction) {
          res.json({ result: false, error: "This player has no prediction on this event" });
          return;
        }

        if (prediction.sabotagedBy) {
          res.json({ result: false, error: "Already sabotaged" });
          return;
        }

        prediction.sabotagedBy = user._id;

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
        Promise.all([prediction.save(), tactic.save()]).then(() => {
          res.json({ result: true });
        });
      });
    });
  });
});

export default router;
