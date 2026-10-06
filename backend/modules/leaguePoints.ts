import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import { getSeason, getWeek } from "./getWeek";
import { BONUS_KINDS, pointsInLeague } from "./scoring";
import type { Bonus, BonusKind } from "./scoring";

type LeagueDoc = InstanceType<typeof League>;
type TacticDoc = InstanceType<typeof Tactic>;
type EventDoc = InstanceType<typeof Event>;

// Season points of every member: the running total kept by /admin/score — { userId: points }
export function getSeasonPoints(league: LeagueDoc) {
  const pointsByUser: Record<string, number> = {};
  league.members.forEach((member) => {
    pointsByUser[String(member.user)] = member.points;
  });
  return pointsByUser;
}

// The sabotages made in one league on some predictions
export function findSabotages(leagueId: mongoose.Types.ObjectId, predictionIds: mongoose.Types.ObjectId[]) {
  return Tactic.find({ league: leagueId, kind: "sabotage", prediction: { $in: predictionIds } });
}

// Every tactic of one league (bonuses + sabotages) on some predictions
export function findTactics(leagueId: mongoose.Types.ObjectId, predictionIds: mongoose.Types.ObjectId[]) {
  return Tactic.find({ league: leagueId, prediction: { $in: predictionIds } });
}

// What counts for one prediction, from the tactics of ONE league: the bonus put on it there, and the sabotage that hit it
export function tacticsOf(tactics: TacticDoc[], predictionId?: mongoose.Types.ObjectId) {
  const onThisPrediction = tactics.filter((tactic) => predictionId && tactic.prediction?.equals(predictionId));

  const bonus: Bonus = {};
  onThisPrediction.forEach((tactic) => {
    if (BONUS_KINDS.includes(tactic.kind as BonusKind)) {
      bonus[tactic.kind as BonusKind] = true;
    }
  });

  const sabotage = onThisPrediction.find((tactic) => tactic.kind === "sabotage");

  return { bonus, sabotage };
}

// Points of every member on one week's grid (this week by default), as they count in this league — { userId: points }
export function getWeekPoints(league: LeagueDoc, season = getSeason(new Date()), week = getWeek(new Date())) {
  return Grid.findOne({ season, week }).then((grid) => {
    if (!grid) {
      return {} as Record<string, number>;
    }

    // Only the predictions made in this league — the event's sport is needed: the Assurance gives the max of that sport
    return Prediction.find({ grid: grid._id, league: league._id })
      .populate<{ event: EventDoc }>("event", "sport")
      .then((predictions) =>
        findTactics(
          league._id,
          predictions.map((prediction) => prediction._id)
        ).then((tactics) => {
          const pointsByUser: Record<string, number> = {};

          predictions.forEach((prediction) => {
            const { bonus, sabotage } = tacticsOf(tactics, prediction._id);
            const sport = prediction.event?.sport ?? "";
            const points = pointsInLeague(prediction.points ?? 0, sport, bonus, Boolean(sabotage));
            const key = String(prediction.user);
            pointsByUser[key] = (pointsByUser[key] ?? 0) + points;
          });

          return pointsByUser;
        })
      );
  });
}
