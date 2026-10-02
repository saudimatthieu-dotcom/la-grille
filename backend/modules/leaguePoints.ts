import mongoose from "mongoose";

import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import { getWeek } from "./getWeek";
import { pointsInLeague } from "./scoring";

type LeagueDoc = InstanceType<typeof League>;

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

// Points of every member on this week's grid, as they count in this league — { userId: points }
export function getWeekPoints(league: LeagueDoc) {
  return Grid.findOne({ season: new Date().getFullYear(), week: getWeek(new Date()) }).then((grid) => {
    if (!grid) {
      return {} as Record<string, number>;
    }

    // "id is ObjectId" tells TypeScript the empty ids are gone, so the list fits the query
    const memberIds = league.members
      .map((member) => member.user)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));

    return Prediction.find({ grid: grid._id, user: { $in: memberIds } }).then((predictions) =>
      findSabotages(
        league._id,
        predictions.map((prediction) => prediction._id)
      ).then((sabotages) => {
        const pointsByUser: Record<string, number> = {};

        predictions.forEach((prediction) => {
          const isSabotagedHere = sabotages.some((tactic) => tactic.prediction?.equals(prediction._id));
          const points = pointsInLeague(prediction.points ?? 0, prediction.bonus ?? {}, isSabotagedHere);
          const key = String(prediction.user);
          pointsByUser[key] = (pointsByUser[key] ?? 0) + points;
        });

        return pointsByUser;
      })
    );
  });
}
