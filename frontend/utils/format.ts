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

// "ven. 2 oct."
export function formatDay(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// "20:45"
export function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "28 sept. – 4 oct." for a week number (ISO weeks: Monday → Sunday, January 4th is always in week 1)
export function formatWeek(season: number, week: number) {
  const january4 = new Date(season, 0, 4);
  const monday = new Date(season, 0, 4 - ((january4.getDay() + 6) % 7) + (week - 1) * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

  return `${monday.toLocaleDateString("fr-FR", options)} – ${sunday.toLocaleDateString("fr-FR", options)}`;
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
    let team = payload.winner === "home" ? event.homeTeam?.name : event.awayTeam?.name;
    if (payload.winner === "draw") {
      team = "Match nul";
    }
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
