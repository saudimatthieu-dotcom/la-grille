import { load, send, type Token } from "./api";

// The matches ticked by hand for a week (backend routes/picks.ts): by an admin for a grid type,
// or by the VIP owner of a sur-mesure league for their league
type Owner = { leagueId?: string; gridType?: string };

// offset: 0 = this week, 1 = next week…
export function loadPicks(token: Token, owner: Owner, offset: number) {
  const query = owner.leagueId ? `leagueId=${owner.leagueId}` : `gridType=${owner.gridType}`;

  return load(`/picks/${token}?${query}&offset=${offset}`);
}

export function savePicks(body: { token: Token; offset: number; eventIds: string[] } & Owner) {
  return send("PUT", "/picks", body);
}
