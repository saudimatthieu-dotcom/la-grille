import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getWeek } from "../modules/getWeek";
import { findSabotages } from "../modules/leaguePoints";
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

          // Coin Chambrage: announce a doubleur or a bouclier when it's turned on (the assurance stays secret)
          if (isActive || kind === "assurance") {
            return;
          }

          // Announced once per prediction: turning it off and on again doesn't spam the chats
          Message.findOne({ type: "system", "meta.kind": kind, "meta.prediction": prediction._id }).then((announced) => {
            if (announced) {
              return;
            }

            // The grid is the same in all the player's leagues, so all of them hear about it — except the public
            // league, which has no chat ($ne: true also matches the old leagues that have no isPublic field)
            League.find({ "members.user": user._id, isPublic: { $ne: true } }).then((leagues) => {
              const title = event.homeTeam?.name ? `${event.homeTeam.name}-${event.awayTeam?.name}` : event.competition;

              // The bouclier doesn't say which match: the saboteur has to guess
              const text =
                kind === "doubleur"
                  ? `⚡ ${user.username} a utilisé un Doubleur sur ${title} !`
                  : `🛡️ ${user.username} vient de placer un Bouclier.`;

              const messages = leagues.map((league) => ({
                league: league._id,
                type: "system",
                text,
                meta: { kind, prediction: prediction._id },
              }));

              Message.insertMany(messages);
            });
          });
        });
      });
    });
  });
});

// Checks that a user may sabotage this rival in this league this week — gives back an error, or the league + this week's grid
function checkSaboteur(leagueId: string, userId: mongoose.Types.ObjectId, targetUserId: string) {
  const season = new Date().getFullYear();
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

    // Everyone plays the same grid: without this check, a stranger's prediction could be targeted
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

      Prediction.find({ user: req.params.targetUserId, grid: context.grid._id }).then((predictions) => {
        findSabotages(
          context.league._id,
          predictions.map((prediction) => prediction._id)
        ).then((sabotages) => {
          const now = new Date();

          // Predictions already sabotaged in this league can't be hit twice (another league can still hit them)
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

      Prediction.findOne({ user: targetUserId, grid: context.grid._id, event: event._id }).then((prediction) => {
        if (!prediction) {
          res.json({ result: false, error: "This player has no prediction on this event" });
          return;
        }

        findSabotages(context.league._id, [prediction._id]).then((sabotages) => {
          if (sabotages.length > 0) {
            res.json({ result: false, error: "Already sabotaged" });
            return;
          }

          // The prediction itself isn't touched: it's shared by every league, the sabotage only counts in this one
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
