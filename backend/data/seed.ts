import "dotenv/config";
import "../models/connection";

import mongoose from "mongoose";
import Event from "../models/events";

// Returns a date `days` from now, at `hour` o'clock
function inDays(days: number, hour: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date;
}

const events = [
  { sport: "football", competition: "Ligue 1", homeTeam: { name: "PSG" }, awayTeam: { name: "OM" }, startsAt: inDays(2, 21) },
  { sport: "football", competition: "Ligue 1", homeTeam: { name: "OL" }, awayTeam: { name: "LOSC" }, startsAt: inDays(3, 17) },
  { sport: "football", competition: "Premier League", homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, startsAt: inDays(3, 18) },
  { sport: "football", competition: "Liga", homeTeam: { name: "Real Madrid" }, awayTeam: { name: "FC Barcelone" }, startsAt: inDays(4, 21) },
  { sport: "basket", competition: "NBA", homeTeam: { name: "Lakers" }, awayTeam: { name: "Celtics" }, ouLine: 227.5, startsAt: inDays(2, 2) },
  { sport: "basket", competition: "Betclic Élite", homeTeam: { name: "Monaco" }, awayTeam: { name: "ASVEL" }, ouLine: 165.5, startsAt: inDays(3, 20) },
  { sport: "rugby", competition: "Top 14", homeTeam: { name: "Toulouse" }, awayTeam: { name: "La Rochelle" }, ouLine: 42.5, startsAt: inDays(3, 21) },
  { sport: "rugby", competition: "Top 14", homeTeam: { name: "Toulon" }, awayTeam: { name: "Racing 92" }, ouLine: 45.5, startsAt: inDays(4, 16) },
  {
    sport: "f1",
    competition: "GP de Singapour",
    participants: [{ name: "Verstappen" }, { name: "Leclerc" }, { name: "Norris" }, { name: "Hamilton" }, { name: "Piastri" }],
    startsAt: inDays(4, 14),
  },
  {
    sport: "tennis",
    competition: "Masters de Shanghai",
    participants: [{ name: "Alcaraz" }, { name: "Sinner" }, { name: "Djokovic" }, { name: "Zverev" }],
    startsAt: inDays(4, 12),
  },
];

// Every mock event: provider "mock", and predictions close when the match starts
const mockEvents = events.map((event, index) => ({
  ...event,
  provider: "mock",
  externalId: `mock-${index + 1}`,
  lockAt: event.startsAt,
}));

Event.deleteMany({ provider: "mock" })
  .then(() => Event.insertMany(mockEvents))
  .then((docs) => {
    console.log(`✅ ${docs.length} events created`);
    return mongoose.disconnect();
  });
  