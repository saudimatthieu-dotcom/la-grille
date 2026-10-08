// Competitions imported by POST /admin/sync-events
// ⚠️ Free API keys = development only. Licensing must be checked before the store release.

export type Competition = {
  leagueId: string;
  sport: "football" | "basket" | "rugby";
  competition: string;
  ouLine?: number;
  // How the month is fetched: round by round (default), or day by day on weekends (the NBA has no rounds)
  schedule?: "rounds" | "weekends";
};

// TheSportsDB league ids — the free key "3" gives 5 matches per call (per round, or per day for the NBA)
export const THESPORTSDB_COMPETITIONS: Competition[] = [
  { leagueId: "4334", sport: "football", competition: "Ligue 1" },
  { leagueId: "4328", sport: "football", competition: "Premier League" },
  { leagueId: "4335", sport: "football", competition: "Liga" },
  { leagueId: "4332", sport: "football", competition: "Serie A" },
  // Over/under lines are a game setting (no free API gives betting lines)
  { leagueId: "4387", sport: "basket", competition: "NBA", ouLine: 227.5, schedule: "weekends" },
  { leagueId: "4423", sport: "basket", competition: "Betclic Élite", ouLine: 165.5 },
  { leagueId: "4430", sport: "rugby", competition: "Top 14", ouLine: 42.5 },
  { leagueId: "4414", sport: "rugby", competition: "Premiership", ouLine: 50.5 },
];
