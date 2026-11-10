import { load, send, type Token } from "./api";

// Leagues: mine, create, join, ranking, seasons (backend routes/leagues.ts)

export function loadMyLeagues(token: Token) {
  return load(`/leagues/user/${token}`);
}

export function createLeague(body: { token: Token; name: string; gridType: string; seasonWeeks?: number }) {
  return send("POST", "/leagues", body);
}

export function joinLeague(body: { token: Token; code: string }) {
  return send("POST", "/leagues/join", body);
}

// week: an older week of the Semaine tab (none: this week)
export function loadRanking(
  leagueId: string,
  token: Token,
  scope: "week" | "month" | "season",
  week?: { season: number; week: number } | null
) {
  const weekQuery = week ? `&season=${week.season}&week=${week.week}` : "";

  return load(`/leagues/${leagueId}/ranking/${token}?scope=${scope}${weekQuery}`);
}

export function loadSeason(leagueId: string, token: Token) {
  return load(`/leagues/${leagueId}/season/${token}`);
}

// The creator starts the next season
export function restartSeason(leagueId: string, body: { token: Token; seasonWeeks?: number }) {
  return send("POST", `/leagues/${leagueId}/restart`, body);
}
