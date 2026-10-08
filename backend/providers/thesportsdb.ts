// TheSportsDB — football, basket, rugby (https://www.thesportsdb.com/documentation)
import type { Competition } from "../config/competitions";

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";
const API_KEY = process.env.THESPORTSDB_KEY ?? "3"; // "3" = free test key

// Statuses TheSportsDB uses for a finished match
const FINISHED_STATUSES = ["FT", "AOT", "AET", "PEN", "Match Finished"];

// The free key allows 30 calls a minute: the import waits this long before each call, one call at a time
const CALL_GAP_MS = 2100;

// A round number can't loop forever: a month is 5 rounds at most (one a week)
const MAX_ROUNDS = 6;

type ApiEvent = {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  strTimestamp: string | null;
  strStatus: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intRound: string | null;
  strSeason: string | null;
};

type ApiResponse = {
  events: ApiEvent[] | null;
};

// "2026-10-09T18:45:00" is UTC but has no "Z": add it, otherwise it's read as local time
function toDate(timestamp: string) {
  return new Date(timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One call to the API, after a pause — the import makes its calls one after the other
function callApi(path: string) {
  return wait(CALL_GAP_MS)
    .then(() => fetch(`${BASE_URL}/${API_KEY}/${path}`))
    .then((response) => response.json() as Promise<ApiResponse>)
    .then((data) => data.events ?? []);
}

// An API match in the shape of our Event model
function toEvent(competition: Competition, event: ApiEvent) {
  const startsAt = toDate(event.strTimestamp as string);

  return {
    sport: competition.sport,
    provider: "thesportsdb",
    externalId: event.idEvent,
    competition: competition.competition,
    homeTeam: { name: event.strHomeTeam, logo: event.strHomeTeamBadge ?? undefined },
    awayTeam: { name: event.strAwayTeam, logo: event.strAwayTeamBadge ?? undefined },
    startsAt,
    lockAt: startsAt,
    ouLine: competition.ouLine,
  };
}

// The rounds from "round" on, until one is empty or starts after "until" (football, rugby, Betclic Élite)
function fetchRounds(competition: Competition, season: string, round: number, until: Date, roundsLeft: number): Promise<ApiEvent[]> {
  if (roundsLeft === 0) {
    return Promise.resolve([]);
  }

  return callApi(`eventsround.php?id=${competition.leagueId}&r=${round}&s=${season}`).then((events) => {
    const starts = events.filter((event) => event.strTimestamp).map((event) => toDate(event.strTimestamp as string));
    const isPastWindow = starts.length > 0 && starts.every((date) => date > until);

    // Season over, or this round is already after the month: stop here
    if (events.length === 0 || isPastWindow) {
      return events;
    }

    return fetchRounds(competition, season, round + 1, until, roundsLeft - 1).then((nextEvents) => [
      ...events,
      ...nextEvents,
    ]);
  });
}

// "2026-10-10" for every Saturday and Sunday from today to "until" (the NBA plays every day: weekends are enough)
function weekendDays(from: Date, until: Date) {
  const days: string[] = [];
  const day = new Date(from);

  while (day <= until) {
    if (day.getDay() === 0 || day.getDay() === 6) {
      days.push(day.toISOString().slice(0, 10));
    }
    day.setDate(day.getDate() + 1);
  }

  return days;
}

// The matches of one league from now to "until", in the shape of our Event model
export function fetchEventsUntil(competition: Competition, until: Date) {
  const now = new Date();

  let request: Promise<ApiEvent[]>;

  if (competition.schedule === "weekends") {
    // One call per day, one after the other
    request = weekendDays(now, until).reduce(
      (previous, day) =>
        previous.then((collected) =>
          callApi(`eventsday.php?d=${day}&l=${competition.leagueId}`).then((events) => [...collected, ...events])
        ),
      Promise.resolve([] as ApiEvent[])
    );
  } else {
    // The next match tells which round and season we're in: the month starts from that round
    request = callApi(`eventsnextleague.php?id=${competition.leagueId}`).then((nextEvents) => {
      const next = nextEvents[0];
      const round = Number(next?.intRound);

      // No next match (off-season) or no round number: just the next match
      if (!next || !next.strSeason || !Number.isInteger(round) || round <= 0) {
        return nextEvents;
      }

      return fetchRounds(competition, next.strSeason, round, until, MAX_ROUNDS);
    });
  }

  return request.then((events) =>
    events
      .filter((event) => event.strTimestamp)
      .map((event) => toEvent(competition, event))
      // A round can hold a match already played, or one after the month
      .filter((event) => event.startsAt >= now && event.startsAt <= until)
  );
}

// Final score of one event, or null if it isn't finished yet
export function fetchEventResult(externalId: string) {
  return fetch(`${BASE_URL}/${API_KEY}/lookupevent.php?id=${externalId}`)
    .then((response) => response.json() as Promise<ApiResponse>)
    .then((data) => {
      const event = data.events?.[0];

      if (
        !event ||
        !event.strStatus ||
        !FINISHED_STATUSES.includes(event.strStatus) ||
        event.intHomeScore === null ||
        event.intAwayScore === null
      ) {
        return null;
      }

      return { homeScore: Number(event.intHomeScore), awayScore: Number(event.intAwayScore) };
    });
}
