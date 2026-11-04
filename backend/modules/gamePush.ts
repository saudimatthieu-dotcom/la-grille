import mongoose from "mongoose";

import Event from "../models/events";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import User from "../models/users";
import { getWeekStart } from "./getWeek";
import { isPlayed } from "./gridTypes";
import { seasonState } from "./seasons";
import { findPicked, findWeekEvents, weekFromNow } from "./selections";
import { NOTIFICATION_TEXTS, sendPush } from "./sendPush";
import type { NotificationKind } from "./sendPush";

type EventDoc = InstanceType<typeof Event>;
type LeagueDoc = InstanceType<typeof League>;
type LockedEvent = { _id: unknown; lockAt?: Date | null };

// The 3 game notifications (the client's rules, 2026-10-24):
//   newGrid     = Monday morning, once the week's matches are picked
//   closingSoon = 24 h before the week's first match locks, only to players with matches left to predict
//   results     = once the whole week is scored (sent by /admin/score, see notifyResults)
// Each one reaches a player at most once per week: User.pushSent remembers the last week it was sent

// newGrid doesn't go out before Monday 8:00 (the server's time zone)
export const NEW_GRID_HOUR = 8;
export const CLOSING_SOON_MS = 24 * 60 * 60 * 1000;

// "2026-45": the week a notification was sent for, saved in User.pushSent
export function weekKey(season: number, week: number) {
  return `${season}-${week}`;
}

// Monday 8:00 has passed (weekStart = Monday 00:00)
export function isNewGridTime(weekStart: Date, now: Date) {
  const sendFrom = new Date(weekStart);
  sendFrom.setHours(NEW_GRID_HOUR);
  return now >= sendFrom;
}

// When the first of these matches locks — null: none can be predicted (no lockAt)
export function firstLock(events: LockedEvent[]) {
  const locks = events.map((event) => event.lockAt).filter((lockAt): lockAt is Date => Boolean(lockAt));

  if (locks.length === 0) {
    return null;
  }

  return new Date(Math.min(...locks.map((lockAt) => lockAt.getTime())));
}

// Less than 24 h before the first lock — and not after it: once a match is closed, it's too late to warn
export function isClosingSoonTime(lock: Date | null, now: Date) {
  return lock !== null && now < lock && lock.getTime() - now.getTime() <= CLOSING_SOON_MS;
}

// The members who still have at least one open match without a prediction in this league
export function missingPlayers(memberIds: string[], openEventIds: string[], predictions: { user?: unknown; event?: unknown }[]) {
  return memberIds.filter((memberId) => {
    const predicted = predictions
      .filter((prediction) => String(prediction.user) === memberId)
      .map((prediction) => String(prediction.event));

    return openEventIds.some((eventId) => !predicted.includes(eventId));
  });
}

function unique(ids: string[]) {
  return [...new Set(ids)];
}

// Every league that plays this week, with its matches (the ones picked by hand).
// Left out: leagues whose season is over (predictions paused) and leagues with nothing picked
async function findPlayingLeagues(season: number, week: number, start: Date, end: Date) {
  const [leagues, weekEvents] = await Promise.all([League.find(), findWeekEvents(start, end)]);

  const running = leagues.filter((league) => {
    const state = seasonState(league);
    return state !== "ending" && state !== "finished";
  });

  const withEvents = await Promise.all(
    running.map((league) =>
      findPicked(league, season, week).then((picked) => ({
        league,
        events: weekEvents.filter((event) => isPlayed(event, picked)),
      }))
    )
  );

  return withEvents.filter((item): item is { league: LeagueDoc; events: EventDoc[] } => item.events.length > 0);
}

// Sends one game notification to these players — only to the ones who didn't get it yet for that week.
// They're marked BEFORE sending: if Expo is down they miss it, but two cron calls never send it twice.
// Answers how many messages went out
async function sendOncePerWeek(userIds: string[], kind: NotificationKind, key: string) {
  if (userIds.length === 0) {
    return 0;
  }

  const field = `pushSent.${kind}`;
  const users = await User.find({ _id: { $in: userIds }, [field]: { $ne: key } }).select("_id").lean();
  const ids = users.map((user) => user._id);

  if (ids.length === 0) {
    return 0;
  }

  await User.updateMany({ _id: { $in: ids } }, { $set: { [field]: key } });
  const { sent } = await sendPush({ _id: { $in: ids } }, kind, NOTIFICATION_TEXTS[kind]);
  return sent;
}

// newGrid: from Monday 8:00, to the members of every league that has matches this week.
// Matches picked later in the week (e.g. Wednesday) send it then, to the players who didn't get it yet
export async function notifyNewGrid() {
  const now = new Date();
  const { season, week, start, end } = weekFromNow(0);

  if (!isNewGridTime(start, now)) {
    return 0;
  }

  const playing = await findPlayingLeagues(season, week, start, end);
  const userIds = playing.flatMap(({ league }) => league.members.map((member) => String(member.user)));

  return sendOncePerWeek(unique(userIds), "newGrid", weekKey(season, week));
}

// closingSoon: in each league whose first match of the week locks within 24 h,
// to the members who still have a match to predict there
export async function notifyClosingSoon() {
  const now = new Date();
  const { season, week, start, end } = weekFromNow(0);

  const playing = await findPlayingLeagues(season, week, start, end);
  const closing = playing.filter(({ events }) => isClosingSoonTime(firstLock(events), now));

  const perLeague = await Promise.all(
    closing.map(({ league, events }) => {
      const openIds = events.filter((event) => event.lockAt && event.lockAt > now).map((event) => String(event._id));

      return Prediction.find({ league: league._id, event: { $in: openIds } })
        .select("user event")
        .lean()
        .then((predictions) =>
          missingPlayers(
            league.members.map((member) => String(member.user)),
            openIds,
            predictions
          )
        );
    })
  );

  return sendOncePerWeek(unique(perLeague.flat()), "closingSoon", weekKey(season, week));
}

// A week closed more than this after its end isn't news any more (e.g. results caught up late): no "results" push
export const RESULTS_FRESH_DAYS = 7;

// Did the week end less than RESULTS_FRESH_DAYS ago?
export function isFreshWeek(season: number, week: number, now: Date) {
  const tooLate = getWeekStart(season, week);
  tooLate.setDate(tooLate.getDate() + 7 + RESULTS_FRESH_DAYS);
  return now < tooLate;
}

// results: the weeks postWeeklyRecaps just closed (all their matches over and scored), to everyone who predicted there
export async function notifyResults(grids: { _id: mongoose.Types.ObjectId; season?: number | null; week?: number | null }[]) {
  const now = new Date();
  let sent = 0;

  for (const grid of grids.filter((item) => isFreshWeek(item.season ?? 0, item.week ?? 0, now))) {
    const userIds = await Prediction.distinct("user", { grid: grid._id });
    sent += await sendOncePerWeek(userIds.map(String), "results", weekKey(grid.season ?? 0, grid.week ?? 0));
  }

  return sent;
}
