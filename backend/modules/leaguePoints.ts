import mongoose from "mongoose";

import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import { getWeek } from "./getWeek";

type LeagueDoc = InstanceType<typeof League>;

// Season points of every member: the running total kept by /admin/score — { userId: points }
export function getSeasonPoints(league: LeagueDoc) {
  const pointsByUser: Record<string, number> = {};
  league.members.forEach((member) => {
    pointsByUser[String(member.user)] = member.points;
  });
  return pointsByUser;
}

// Points of every member on this week's grid of a league — { userId: points }
export function getWeekPoints(leagueId: mongoose.Types.ObjectId) {
  return Grid.findOne({ league: leagueId, season: new Date().getFullYear(), week: getWeek(new Date()) }).then(
    (grid) => {
      if (!grid) {
        return {} as Record<string, number>;
      }

      return Prediction.find({ grid: grid._id }).then((predictions) => {
        const pointsByUser: Record<string, number> = {};
        predictions.forEach((prediction) => {
          const key = String(prediction.user);
          pointsByUser[key] = (pointsByUser[key] ?? 0) + (prediction.points ?? 0);
        });
        return pointsByUser;
      });
    }
  );
}
