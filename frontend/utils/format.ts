import type { PredictionPayload, SportEvent } from "../types";

// "PSG – OM" for team sports, the competition name for F1 and tennis
export function eventTitle(event: SportEvent) {
  return event.homeTeam && event.awayTeam ? `${event.homeTeam.name} – ${event.awayTeam.name}` : event.competition;
}

// "lun. 28, 21:00"
export function formatDate(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "2–1" for team sports, the podium for F1, the winner for tennis
export function formatResult(event: SportEvent) {
  const result = event.result;

  if (!result) {
    return "";
  }
  if (result.podium) {
    return result.podium.map((name, index) => `${index + 1}. ${name}`).join("  ");
  }
  if (result.winner) {
    return `Vainqueur : ${result.winner}`;
  }
  return `${result.homeScore}–${result.awayScore}`;
}

// What I predicted, in words — same shapes as formatResult
export function formatPayload(event: SportEvent, payload: PredictionPayload) {
  if (payload.podium) {
    return payload.podium.map((name, index) => `${index + 1}. ${name}`).join("  ");
  }
  if (event.sport === "tennis") {
    return `${payload.winner} bat ${payload.finalist}`;
  }
  if (payload.overUnder) {
    const team = payload.winner === "home" ? event.homeTeam?.name : event.awayTeam?.name;
    const line = payload.overUnder === "over" ? `plus de ${event.ouLine}` : `moins de ${event.ouLine}`;
    return `${team} · ${line}`;
  }
  return `${payload.homeScore}–${payload.awayScore}`;
}

// Best score of each sport (same as backend maxPoints) — "Potentiel : 3 points"
export function maxPoints(sport: string) {
  if (sport === "football" || sport === "tennis") {
    return 3;
  }
  if (sport === "basket" || sport === "rugby") {
    return 2;
  }
  if (sport === "f1" || sport === "cyclisme") {
    return 6;
  }
  return 0;
}

// "1er", "2e", "3e"
export function ordinal(rank: number) {
  return rank === 1 ? "1er" : `${rank}e`;
}
