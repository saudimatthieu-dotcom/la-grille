import { load, send, type Token } from "./api";

// The admin screen (backend routes/admin.ts)

// Imports the matches of the next weeks from the sports APIs
export function importMatches(body: { token: Token }) {
  return send("POST", "/admin/import", body);
}

// The players whose username or email contains the search
export function findPlayers(token: Token, search: string) {
  return load(`/admin/users/${token}?search=${encodeURIComponent(search.trim())}`);
}

export function saveVip(body: { token: Token; userId: string; months: number }) {
  return send("PUT", "/admin/vip", body);
}

// The chat messages reported by the players, still waiting for an admin
export function loadReports(token: Token) {
  return load(`/admin/reports/${token}`);
}

// An admin handles a report: "hide" the message, or "dismiss" the report
export function saveReport(reportId: string, body: { token: Token; action: "hide" | "dismiss" }) {
  return send("PUT", `/admin/reports/${reportId}`, body);
}

// How the month import is going (it runs in the background on the server)
export function loadImportStatus(token: Token) {
  return load(`/admin/import/${token}`);
}
