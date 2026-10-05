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
import { BONUS_KINDS, BONUS_PER_WEEK, isBonusAllowed } from "../modules/scoring";
import type { BonusKind } from "../modules/scoring";

const router = express.Router();

type LeagueDoc = InstanceType<typeof League>;
type TacticDoc = InstanceType<typeof Tactic>;

// What loadBonusContext finds — or an error. Written out because TypeScript can't guess it through 3 nested .then()
type BonusContext =
  | { error: string }
  | {
      user: InstanceType<typeof User>;
      prediction: InstanceType<typeof Prediction>;
      event: InstanceType<typeof Event>;
      grid: InstanceType<typeof Grid>;
      leagues: LeagueDoc[];
      tactics: TacticDoc[];
    };

// Finds what a bonus needs: me, my prediction, its match and its week, my leagues, and my bonuses of that week
function loadBonusContext(token: string, predictionId: string) {
  return User.findOne({ token }).then<BonusContext>((user) => {
    if (!user) {
      return { error: "User not found" };
    }

    return Prediction.findById(predictionId).then<BonusContext>((prediction) => {
      // Same message for "doesn't exist" and "not yours": gives nothing away
      if (!prediction || !prediction.user?.equals(user._id)) {
        return { error: "Prediction not found" };
      }

      return Promise.all([
        Event.findById(prediction.event),
        Grid.findById(prediction.grid),
        League.find({ "members.user": user._id }),
      ]).then<BonusContext>(([event, grid, leagues]) => {
        if (!event || !grid) {
          return { error: "Prediction not found" };
        }

        // My bonuses of the prediction's week, in all my leagues: the stock is counted from them
        return Tactic.find({ actor: user._id, season: grid.season, week: grid.week, kind: { $in: BONUS_KINDS } }).then(
          (tactics) => ({ user, prediction, event, grid, leagues, tactics })
        );
      });
    });
  });
}

// One league as the BonusBar shows it: my bonus on this prediction there, and what's left of my week's bonuses there
function bonusStateOf(league: LeagueDoc, tactics: TacticDoc[], predictionId: mongoose.Types.ObjectId) {
  const tacticsHere = tactics.filter((tactic) => tactic.league?.equals(league._id));
  const active = tacticsHere.find((tactic) => tactic.prediction?.equals(predictionId));

  // No stored stock: 1 per week minus what I already used this week — so nothing piles up from one week to the next
  const stock = { doubleur: 0, assurance: 0, bouclier: 0 };
  BONUS_KINDS.forEach((kind) => {
    stock[kind] = BONUS_PER_WEEK - tacticsHere.filter((tactic) => tactic.kind === kind).length;
  });

  return {
    leagueId: league._id,
    leagueName: league.name,
    active: (active?.kind as BonusKind | undefined) ?? null,
    stock,
  };
}

// GET /tactics/bonus/:predictionId/:token — my bonus on this prediction in each of my private leagues (BonusBar)
router.get("/bonus/:predictionId/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.predictionId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  loadBonusContext(req.params.token, req.params.predictionId).then((context) => {
    if ("error" in context) {
      res.json({ result: false, error: context.error });
      return;
    }

    // The public league plays without bonuses
    const privateLeagues = context.leagues.filter((league) => !league.isPublic);

    res.json({
      result: true,
      leagues: privateLeagues.map((league) => bonusStateOf(league, context.tactics, context.prediction._id)),
    });
  });
});

// POST /tactics/bonus — puts a doubleur, assurance or bouclier on one prediction in one league, or takes it off
router.post("/bonus", (req, res) => {
  if (!checkBody(req.body, ["token", "predictionId", "leagueId", "kind"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!BONUS_KINDS.includes(req.body.kind)) {
    res.json({ result: false, error: "Invalid bonus" });
    return;
  }

  if (!mongoose.isValidObjectId(req.body.predictionId) || !mongoose.isValidObjectId(req.body.leagueId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  const kind: BonusKind = req.body.kind;

  loadBonusContext(req.body.token, req.body.predictionId).then((context) => {
    if ("error" in context) {
      res.json({ result: false, error: context.error });
      return;
    }

    const { user, prediction, event, grid, tactics } = context;
    const league = context.leagues.find((item) => item._id.equals(req.body.leagueId));

    if (!league) {
      res.json({ result: false, error: "Not a member of this league" });
      return;
    }

    if (league.isPublic) {
      res.json({ result: false, error: "No bonus in the public league" });
      return;
    }

    if (!event.lockAt || event.lockAt <= new Date()) {
      res.json({ result: false, error: "Predictions are closed for this event" });
      return;
    }

    if (!isBonusAllowed(kind, event.sport)) {
      res.json({ result: false, error: "No assurance in F1 and cycling" });
      return;
    }

    // My bonus already on this prediction in this league, if any
    const current = tactics.find(
      (tactic) => tactic.league?.equals(league._id) && tactic.prediction?.equals(prediction._id)
    );

    // The same bonus again: taken off — it goes back to this week's stock
    if (current && current.kind === kind) {
      Tactic.deleteOne({ _id: current._id }).then(() => {
        const remaining = tactics.filter((tactic) => !tactic._id.equals(current._id));
        res.json({ result: true, league: bonusStateOf(league, remaining, prediction._id) });
      });
      return;
    }

    // Bonuses don't stack: one per prediction in each league
    if (current) {
      res.json({ result: false, error: "Only one bonus per prediction" });
      return;
    }

    if (bonusStateOf(league, tactics, prediction._id).stock[kind] <= 0) {
      res.json({ result: false, error: "No bonus left this week" });
      return;
    }

    // The prediction itself isn't touched: it's shared by every league, the bonus only counts in this one
    const newTactic = new Tactic({
      league: league._id,
      season: grid.season,
      week: grid.week,
      actor: user._id,
      kind,
      prediction: prediction._id,
    });

    newTactic.save().then((savedTactic) => {
      res.json({ result: true, league: bonusStateOf(league, [...tactics, savedTactic], prediction._id) });

      // Coin Chambrage: a doubleur or a bouclier is announced in this league's chat (the assurance stays secret)
      if (kind === "assurance") {
        return;
      }

      // Announced once per prediction in this league: turning it off and on again doesn't spam the chat
      Message.findOne({ league: league._id, type: "system", "meta.kind": kind, "meta.prediction": prediction._id }).then(
        (announced) => {
          if (announced) {
            return;
          }

          const title = event.homeTeam?.name ? `${event.homeTeam.name}-${event.awayTeam?.name}` : event.competition;

          // The bouclier doesn't say which match: the saboteur has to guess
          const text =
            kind === "doubleur"
              ? `⚡ ${user.username} a utilisé un Doubleur sur ${title} !`
              : `🛡️ ${user.username} vient de placer un Bouclier.`;

          const newMessage = new Message({
            league: league._id,
            type: "system",
            text,
            meta: { kind, prediction: prediction._id },
          });

          newMessage.save();
        }
      );
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
