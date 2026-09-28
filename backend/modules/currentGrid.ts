import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import { getWeek } from "./getWeek";

type EventDoc = InstanceType<typeof Event>;

// Finds this week's grid of a league (with its events), or creates it from the next 10 events.
// Gives back null when there is no upcoming event to build a grid from.
export function getCurrentGrid(leagueId: mongoose.Types.ObjectId) {
  const season = new Date().getFullYear();
  const week = getWeek(new Date());

  const findGrid = () =>
    Grid.findOne({ league: leagueId, season, week }).populate<{ events: EventDoc[] }>("events");

  return findGrid().then((grid) => {
    if (grid) {
      return grid;
    }

    return Event.find({ startsAt: { $gt: new Date() } })
      .sort({ startsAt: 1 })
      .limit(10)
      .then((events) => {
        if (events.length === 0) {
          return null;
        }

        const newGrid = new Grid({
          league: leagueId,
          season,
          week,
          events: events.map((event) => event._id),
          lockAt: events[0].lockAt,
        });

        // If two members open the league at the same second, the unique index refuses the second grid:
        // we then simply read the one that was just created
        return newGrid
          .save()
          .then(() => findGrid())
          .catch(() => findGrid());
      });
  });
}
