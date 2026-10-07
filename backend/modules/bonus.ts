import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Message from "../models/messages";
import Tactic from "../models/tactics";
import User from "../models/users";
import { BONUS_KINDS, BONUS_PER_WEEK, isBonusAllowed } from "./scoring";
import type { BonusKind } from "./scoring";

type TacticDoc = InstanceType<typeof Tactic>;

// Just what the stock needs from a tactic — plain objects in the tests, Tactic docs in the routes
type BonusTactic = { kind?: string | null; prediction?: unknown };

// My bonuses of one week in one league: the stock is counted from them
export function findWeekBonuses(
  userId: mongoose.Types.ObjectId,
  leagueId: mongoose.Types.ObjectId,
  season?: number | null,
  week?: number | null
) {
  return Tactic.find({ actor: userId, league: leagueId, season, week, kind: { $in: BONUS_KINDS } });
}

// What's left of my week's bonuses: 1 of each minus what I already used — nothing is stored, so nothing piles up.
// The bonus already on this prediction doesn't count: saving the prediction again gives it back first
export function bonusStock(tactics: BonusTactic[], predictionId?: unknown) {
  const used = tactics.filter((tactic) => !predictionId || String(tactic.prediction) !== String(predictionId));

  const stock = { doubleur: 0, assurance: 0, bouclier: 0 };
  BONUS_KINDS.forEach((kind) => {
    stock[kind] = BONUS_PER_WEEK - used.filter((tactic) => tactic.kind === kind).length;
  });

  return stock;
}

// Why this bonus can't go on this prediction — or null when it can
export function bonusError(kind: BonusKind, isPublic: boolean, sport: string, stock: Record<BonusKind, number>) {
  if (isPublic) {
    return "No bonus in the public league";
  }

  if (!isBonusAllowed(kind, sport)) {
    return "No assurance in F1 and cycling";
  }

  if (stock[kind] <= 0) {
    return "No bonus left this week";
  }

  return null;
}

type SaveBonusParams = {
  user: InstanceType<typeof User>;
  league: InstanceType<typeof League>;
  grid: InstanceType<typeof Grid>;
  event: InstanceType<typeof Event>;
  predictionId: mongoose.Types.ObjectId;
  // My bonuses of the week in this league (findWeekBonuses), read before the prediction was saved
  tactics: TacticDoc[];
  // null: no bonus on this prediction
  kind: BonusKind | null;
};

// Puts the chosen bonus on the prediction (in its league), in place of the one it had — checked by bonusError first
export function saveBonus({ user, league, grid, event, predictionId, tactics, kind }: SaveBonusParams) {
  const current = tactics.find((tactic) => tactic.prediction?.equals(predictionId));

  // Same bonus as before: nothing to do (and nothing to announce again)
  if ((current?.kind ?? null) === kind) {
    return Promise.resolve();
  }

  // deleteMany: a prediction from before bonuses stopped stacking could still carry two
  return Tactic.deleteMany({ league: league._id, actor: user._id, prediction: predictionId, kind: { $in: BONUS_KINDS } }).then(
    () => {
      if (!kind) {
        return;
      }

      const newTactic = new Tactic({
        league: league._id,
        season: grid.season,
        week: grid.week,
        actor: user._id,
        kind,
        prediction: predictionId,
      });

      return newTactic.save().then(() => announceBonus(user, league, event, predictionId, kind));
    }
  );
}

// Coin Chambrage: a doubleur or a bouclier is announced in the league's chat (the assurance stays secret)
function announceBonus(
  user: InstanceType<typeof User>,
  league: InstanceType<typeof League>,
  event: InstanceType<typeof Event>,
  predictionId: mongoose.Types.ObjectId,
  kind: BonusKind
) {
  if (kind === "assurance") {
    return;
  }

  // Announced once per prediction in this league: taking it off and putting it back doesn't spam the chat
  Message.findOne({ league: league._id, type: "system", "meta.kind": kind, "meta.prediction": predictionId }).then(
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
        meta: { kind, prediction: predictionId },
      });

      newMessage.save();
    }
  );
}
