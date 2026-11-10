import { load, send, type Token } from "./api";

// Bonuses and sabotages (backend routes/tactics.ts)

// What's left of my week's bonuses in this league — the bonus already on predictionId counts as available
export function loadBonuses(gridId: string, token: Token, leagueId: string, predictionId?: string) {
  const query = predictionId ? `&predictionId=${predictionId}` : "";

  return load(`/tactics/bonus/${gridId}/${token}?leagueId=${leagueId}${query}`);
}

// The rival's matches I can still sabotage
export function loadSabotageTargets(leagueId: string, targetUserId: string, token: Token) {
  return load(`/tactics/sabotage/${leagueId}/${targetUserId}/${token}`);
}

export function sendSabotage(body: { token: Token; leagueId: string; targetUserId: string; eventId: string }) {
  return send("POST", "/tactics/sabotage", body);
}
