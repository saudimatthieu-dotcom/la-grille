// Fills a TEST database with matches for every sport, to try the whole app locally before deploying.
//   npx tsx scripts/seedTestEvents.ts            creates the matches (open: they start in the next days)
//   npx tsx scripts/seedTestEvents.ts --finish   gives them their final results (then call POST /admin/score)
//   npx tsx scripts/seedTestEvents.ts --clean    removes them
// It refuses to run unless the database name ends with "-test": the real data is never touched.
import "dotenv/config";
import mongoose from "mongoose";

import Event from "../models/events";
import Selection from "../models/selections";
import { getMonday, getSeason, getWeek } from "../modules/getWeek";
import { isInGrid } from "../modules/gridTypes";

const connectionString = process.env.CONNECTION_STRING ?? "";
const databaseName = connectionString ? new URL(connectionString).pathname.slice(1) : "";

const DRIVERS = ["Norris", "Verstappen", "Hadjar", "Piastri", "Leclerc", "Hamilton", "Russell", "Antonelli"];

type Seed = {
  sport: "football" | "basket" | "rugby" | "handball" | "f1" | "cyclisme" | "tennis";
  competition: string;
  // Kick-off: this many hours from now
  hours: number;
  home?: string;
  away?: string;
  participants?: string[];
  ouLine?: number;
  // What --finish gives the match
  result: object;
};

const SEEDS: Seed[] = [
  // Football, men and women
  { sport: "football", competition: "Ligue 1", hours: 30, home: "PSG", away: "OM", result: { homeScore: 2, awayScore: 1 } },
  { sport: "football", competition: "Ligue 1", hours: 31, home: "Lille", away: "Lens", result: { homeScore: 0, awayScore: 0 } },
  { sport: "football", competition: "Premier League", hours: 52, home: "Arsenal", away: "Chelsea", result: { homeScore: 1, awayScore: 3 } },
  { sport: "football", competition: "Feminine Division 1", hours: 54, home: "Lyon", away: "Paris FC", result: { homeScore: 3, awayScore: 0 } },
  { sport: "football", competition: "UEFA Champions League Women", hours: 76, home: "Barcelone", away: "Chelsea", result: { homeScore: 2, awayScore: 2 } },
  // Basket, men and women (over/under on the total)
  { sport: "basket", competition: "Betclic Élite", hours: 32, home: "Strasbourg", away: "Monaco", ouLine: 165.5, result: { homeScore: 81, awayScore: 90 } },
  { sport: "basket", competition: "Betclic Élite", hours: 33, home: "Nanterre", away: "Dijon", ouLine: 165.5, result: { homeScore: 70, awayScore: 68 } },
  { sport: "basket", competition: "NBA", hours: 50, home: "Lakers", away: "Celtics", ouLine: 227.5, result: { homeScore: 118, awayScore: 121 } },
  { sport: "basket", competition: "Ligue Féminine de Basketball", hours: 55, home: "Bourges", away: "Villeneuve d'Ascq", ouLine: 150.5, result: { homeScore: 77, awayScore: 69 } },
  // Rugby
  { sport: "rugby", competition: "Top 14", hours: 54, home: "Clermont", away: "Toulon", ouLine: 42.5, result: { homeScore: 24, awayScore: 20 } },
  { sport: "rugby", competition: "Premiership", hours: 56, home: "Leicester", away: "Bath", ouLine: 50.5, result: { homeScore: 18, awayScore: 22 } },
  // Handball: no prediction screen and no scoring in the app yet
  { sport: "handball", competition: "LNH Division 1", hours: 33, home: "Nantes", away: "Chambéry", result: { homeScore: 31, awayScore: 28 } },
  { sport: "handball", competition: "EHF Champions League Women", hours: 80, home: "Metz", away: "Győr", result: { homeScore: 27, awayScore: 30 } },
  // F1: a podium of 3 among the drivers
  {
    sport: "f1",
    competition: "Abu Dhabi Grand Prix",
    hours: 60,
    participants: DRIVERS,
    result: { podium: ["Norris", "Verstappen", "Hadjar"] },
  },
  // Tennis: winner + finalist among the players
  {
    sport: "tennis",
    competition: "ATP Paris Masters",
    hours: 40,
    participants: ["Sinner", "Alcaraz", "Djokovic", "Zverev"],
    result: { winner: "Sinner", finalist: "Alcaraz" },
  },
  {
    sport: "tennis",
    competition: "WTA Finals",
    hours: 34,
    participants: ["Swiatek", "Sabalenka", "Gauff", "Rybakina"],
    result: { winner: "Sabalenka", finalist: "Swiatek" },
  },
  // Cycling: a podium of 3 (no prediction screen in the app yet)
  {
    sport: "cyclisme",
    competition: "Tour Down Under - étape 2",
    hours: 36,
    participants: ["Pogacar", "Vingegaard", "Evenepoel", "Van der Poel"],
    result: { podium: ["Pogacar", "Evenepoel", "Vingegaard"] },
  },
  {
    sport: "cyclisme",
    competition: "Giro d'Italia Donne - étape 2",
    hours: 58,
    participants: ["Vollering", "Kopecky", "Longo Borghini", "Niewiadoma"],
    result: { podium: ["Kopecky", "Vollering", "Niewiadoma"] },
  },
];

function toEvent(seed: Seed, index: number) {
  const startsAt = new Date(Date.now() + seed.hours * 3600 * 1000);

  return {
    sport: seed.sport,
    provider: "test",
    externalId: `seed-${index + 1}`,
    competition: seed.competition,
    homeTeam: seed.home ? { name: seed.home } : undefined,
    awayTeam: seed.away ? { name: seed.away } : undefined,
    participants: seed.participants?.map((name) => ({ name })),
    startsAt,
    lockAt: startsAt,
    ouLine: seed.ouLine,
  };
}

async function create() {
  const events = [];

  for (const [index, seed] of SEEDS.entries()) {
    const data = toEvent(seed, index);
    const event = await Event.findOneAndUpdate(
      { provider: data.provider, externalId: data.externalId },
      { ...data, status: "scheduled", result: null },
      { upsert: true, returnDocument: "after" }
    );
    events.push(event);
  }

  // No automatic grid: the matches an admin ticked are the ones played. We tick them here, per week and per grid type
  const weeks = new Map<string, { season: number; week: number }>();
  events.forEach((event) => {
    const date = event.startsAt as Date;
    weeks.set(`${getSeason(date)}-${getWeek(date)}`, { season: getSeason(date), week: getWeek(date) });
  });

  for (const { season, week } of weeks.values()) {
    const ofThisWeek = events.filter(
      (event) => getSeason(event.startsAt as Date) === season && getWeek(event.startsAt as Date) === week
    );

    for (const gridType of ["officielle", "classique", "exotique"] as const) {
      const picked = ofThisWeek.filter((event) => isInGrid(gridType, event)).map((event) => event._id);

      await Selection.findOneAndUpdate(
        { season, week, gridType, league: null },
        { $addToSet: { events: { $each: picked } }, updatedAt: new Date() },
        { upsert: true }
      );
      console.log(`Week ${week}: ${picked.length} matches ticked for ${gridType}`);
    }
  }

  console.log(`${events.length} test matches ready (starting this week: ${getMonday(new Date()).toDateString()})`);
}

async function finish() {
  for (const [index, seed] of SEEDS.entries()) {
    await Event.updateOne(
      { provider: "test", externalId: `seed-${index + 1}` },
      { status: "finished", result: seed.result }
    );
  }

  console.log("Test matches finished. Now call POST /admin/score (with the admin secret) to give the points.");
}

async function clean() {
  const events = await Event.find({ provider: "test" }, "_id");
  const ids = events.map((event) => event._id);

  await Selection.updateMany({}, { $pull: { events: { $in: ids } } });
  await Event.deleteMany({ provider: "test" });
  console.log(`${ids.length} test matches removed`);
}

async function main() {
  if (!databaseName.endsWith("-test")) {
    console.log(`Refused: the database is "${databaseName}", not a "-test" one. Set CONNECTION_STRING to a test database.`);
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(connectionString);
  console.log(`Database: ${databaseName}`);

  if (process.argv.includes("--clean")) {
    await clean();
  } else if (process.argv.includes("--finish")) {
    await finish();
  } else {
    await create();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
