import { load, send, type Token } from "./api";
import type { BonusKind, PredictionPayload } from "../types";

// The week's grid, my predictions and their results (backend routes/grids.ts and routes/predictions.ts).
// leagueId: the league I play in (none: the public league)

export function loadCurrentGrid(token: Token, leagueId?: string) {
  return load(`/grids/current/${token}${leagueId ? `?leagueId=${leagueId}` : ""}`);
}

export function loadGridPredictions(gridId: string, token: Token, leagueId?: string) {
  return load(`/predictions/grid/${gridId}/${token}${leagueId ? `?leagueId=${leagueId}` : ""}`);
}

// With a league, the points count its sabotages and I get my rank in it
export function loadResults(gridId: string, token: Token, leagueId?: string) {
  return load(`/predictions/results/${gridId}/${token}${leagueId ? `?leagueId=${leagueId}` : ""}`);
}

export function savePrediction(body: {
  token: Token;
  gridId: string;
  eventId: string;
  leagueId?: string;
  payload: PredictionPayload;
  // null: no bonus
  bonus: BonusKind | null;
}) {
  return send("POST", "/predictions", body);
}
