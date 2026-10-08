import Event from "../models/events";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import User from "../models/users";
import { getPublicLeague } from "./publicLeague";
import { extendVip } from "./vip";

// The public league never resets: its prize is monthly — the #1 of each calendar month wins this many months of VIP
export const PRIZE_MONTHS = 1;

// If a match never gets its result (API down…), the month is still awarded this many days after its end
const MAX_WAIT_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10" for any date in October 2026 (server time)
export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// The 1st of the month 00:00 → the 1st of the next month 00:00
export function monthBounds(key: string) {
  const [year, month] = key.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

// The month before the date's month
export function previousMonthKey(date: Date) {
  return monthKey(new Date(date.getFullYear(), date.getMonth() - 1, 1));
}

// The winners: everyone with the most points (ties all win) — nobody when the best has 0
export function pickWinners(pointsByUser: Record<string, number>) {
  const best = Math.max(0, ...Object.values(pointsByUser));

  if (best === 0) {
    return [];
  }

  return Object.keys(pointsByUser).filter((userId) => pointsByUser[userId] === best);
}

// Points of every player in the public league for the matches of one month (raw points: no bonus there)
export function getMonthPoints(league: InstanceType<typeof League>, key: string) {
  const { start, end } = monthBounds(key);

  return Event.find({ startsAt: { $gte: start, $lt: end } }, "_id status").then((events) =>
    Prediction.find({ league: league._id, event: { $in: events.map((event) => event._id) } }).then((predictions) => {
      const pointsByUser: Record<string, number> = {};

      predictions.forEach((prediction) => {
        const key = String(prediction.user);
        pointsByUser[key] = (pointsByUser[key] ?? 0) + (prediction.points ?? 0);
      });

      // Still scoring: a match of the month that isn't cancelled and has predictions without points
      const isScoring = predictions.some((prediction) => {
        const event = events.find((item) => prediction.event && item._id.equals(prediction.event));
        return prediction.points === null && event?.status !== "cancelled";
      });

      return { pointsByUser, isScoring };
    })
  );
}

// Gives last month's prize once its matches are scored: a month of VIP to its #1 (ties: all of them).
// Called by /admin/score — gives back the winners' names (empty when nothing was awarded this time)
export function awardMonthlyPrize() {
  const now = new Date();
  const key = previousMonthKey(now);

  return getPublicLeague().then((league) => {
    // Awarded once per month: the month is written down even when nobody won
    if (!league || league.monthlyWinners.some((entry) => entry.month === key)) {
      return [] as string[];
    }

    return getMonthPoints(league, key).then(({ pointsByUser, isScoring }) => {
      const { end } = monthBounds(key);

      if (isScoring && now.getTime() < end.getTime() + MAX_WAIT_DAYS * DAY_MS) {
        return [] as string[];
      }

      const winnerIds = pickWinners(pointsByUser);

      return User.find({ _id: { $in: winnerIds } }).then((winners) => {
        winners.forEach((winner) => {
          winner.vipUntil = extendVip(winner.vipUntil, PRIZE_MONTHS, now);
        });

        league.monthlyWinners.push({
          month: key,
          winners: winners.map((winner) => ({
            user: winner._id,
            username: winner.username,
            points: pointsByUser[String(winner._id)],
          })),
        });

        return Promise.all([...winners.map((winner) => winner.save()), league.save()]).then(() =>
          winners.map((winner) => winner.username)
        );
      });
    });
  });
}
