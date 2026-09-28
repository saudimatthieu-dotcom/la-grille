// TheSportsDB — football, basket, rugby (https://www.thesportsdb.com/documentation)
import type { Competition } from "../config/competitions";

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";
const API_KEY = process.env.THESPORTSDB_KEY ?? "3"; // "3" = free test key

// Statuses TheSportsDB uses for a finished match
const FINISHED_STATUSES = ["FT", "AOT", "AET", "PEN", "Match Finished"];

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
};

type ApiResponse = {
  events: ApiEvent[] | null;
};

// "2026-10-09T18:45:00" is UTC but has no "Z": add it, otherwise it's read as local time
function toDate(timestamp: string) {
  return new Date(timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`);
}

// Upcoming events of one league, in the shape of our Event model
export function fetchUpcomingEvents(competition: Competition) {
  return fetch(`${BASE_URL}/${API_KEY}/eventsnextleague.php?id=${competition.leagueId}`)
    .then((response) => response.json() as Promise<ApiResponse>)
    .then((data) => {
      const events = data.events ?? [];

      return events
        .filter((event) => event.strTimestamp)
        .map((event) => {
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
        });
    });
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
