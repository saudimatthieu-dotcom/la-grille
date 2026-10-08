import Event from "../models/events";
import League from "../models/leagues";
import Selection from "../models/selections";
import { getSeason, getWeek, getWeekStart } from "./getWeek";
import { isPlayed } from "./gridTypes";

type LeagueDoc = InstanceType<typeof League>;
type GridEvent = { _id: unknown; sport?: string | null; competition?: string | null };

// Which selection a league follows: its own (sur-mesure) or its grid type's (admins) — no type: the officielle
export function selectionFilter(league: LeagueDoc, season: number, week: number) {
  if (league.gridType === "surmesure") {
    return { season, week, league: league._id };
  }

  return { season, week, gridType: league.gridType ?? "officielle", league: null };
}

// The ids of the matches picked by hand for this league that week — null: nothing picked (automatic)
export function findPicked(league: LeagueDoc, season?: number | null, week?: number | null) {
  return Selection.findOne(selectionFilter(league, season ?? 0, week ?? 0)).then((selection) =>
    selection && selection.events.length > 0 ? selection.events.map(String) : null
  );
}

// The matches of a grid that this league plays: picked by hand, or the ones of its type
export function leagueEvents<T extends GridEvent>(league: LeagueDoc, grid: { season?: number | null; week?: number | null; events: T[] }) {
  return findPicked(league, grid.season, grid.week).then((picked) =>
    grid.events.filter((event) => isPlayed(league.gridType, event, picked))
  );
}

// The week "offset" weeks from now (0: this one, 1: next one…) — the admins prepare the coming weeks
export function weekFromNow(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset * 7);

  const season = getSeason(date);
  const week = getWeek(date);
  const start = getWeekStart(season, week);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);

  return { season, week, start, end };
}

// Every match of a week that isn't cancelled, in kick-off order: what can be picked
export function findWeekEvents(start: Date, end: Date) {
  return Event.find({ startsAt: { $gte: start, $lt: end }, status: { $ne: "cancelled" } }).sort({ startsAt: 1 });
}
