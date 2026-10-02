import Event from "../models/events";
import Grid from "../models/grids";
import { getWeek } from "./getWeek";

type EventDoc = InstanceType<typeof Event>;

// Monday 00:00 of this week → Monday 00:00 of next week
function getWeekBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { start, end };
}

// This week's grid (with its events, in kick-off order): every match of the week, no limit.
// Gives back null when there is no match this week.
export function getCurrentGrid() {
  const now = new Date();
  const season = now.getFullYear();
  const week = getWeek(now);
  const { start, end } = getWeekBounds(now);

  return Event.find({ startsAt: { $gte: start, $lt: end } }).then((events) => {
    const eventIds = events.map((event) => event._id);

    // upsert: the first visit creates the grid — $addToSet: matches imported later in the week join it,
    // and none is ever removed (a prediction already made always keeps its match)
    const addWeekEvents = () =>
      Grid.findOneAndUpdate(
        { season, week },
        { $addToSet: { events: { $each: eventIds } } },
        { upsert: true, returnDocument: "after" }
      ).populate<{ events: EventDoc[] }>({ path: "events", options: { sort: { startsAt: 1 } } });

    // If two players open the grid at the same second, the unique index refuses the second upsert:
    // we then simply try again, the grid exists by now
    return addWeekEvents()
      .catch(() => addWeekEvents())
      .then((grid) => {
        if (!grid || grid.events.length === 0) {
          return null;
        }

        return grid;
      });
  });
}
