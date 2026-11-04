import mongoose from "mongoose";

import AdReward from "../models/adRewards";
import League from "../models/leagues";
import { getSeason, getWeek } from "./getWeek";
import { seasonState } from "./seasons";

// How many extra doubleurs a rewarded ad can give, per league and per week
// (the client's rule: "a 30 s ad = 1 extra doubleur" — capped so ads can't replace the game)
export const AD_DOUBLEURS_PER_WEEK = 1;

// The extra doubleurs I earned with ads this week in this league
export function countWeekAdRewards(
  userId: mongoose.Types.ObjectId,
  leagueId: mongoose.Types.ObjectId,
  season?: number | null,
  week?: number | null
) {
  return AdReward.countDocuments({ user: userId, league: leagueId, season, week });
}

// Can I still watch an ad for a doubleur this week in this league?
export function canEarnAdReward(earnedThisWeek: number) {
  return earnedThisWeek < AD_DOUBLEURS_PER_WEEK;
}

// Why this player can't get the doubleur in this league — or null when they can
export function adRewardError(league: { isPublic?: boolean | null; members: { user?: unknown }[] } | null, userId: string) {
  if (!league) {
    return "League not found";
  }

  if (league.isPublic) {
    return "No bonus in the public league";
  }

  if (!league.members.some((member) => String(member.user) === userId)) {
    return "Not a member of this league";
  }

  return null;
}

// Gives the extra doubleur for this week — called once Google confirmed the ad was watched (or by the test route).
// Answers null when it's saved, or why it wasn't
export async function grantAdReward(userId: string, leagueId: string, transactionId: string) {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(leagueId)) {
    return "Invalid id";
  }

  const league = await League.findById(leagueId);
  const error = adRewardError(league, userId);

  if (error || !league) {
    return error;
  }

  const state = seasonState(league);

  if (state === "ending" || state === "finished") {
    return "The season is over";
  }

  const now = new Date();
  const season = getSeason(now);
  const week = getWeek(now);
  const user = new mongoose.Types.ObjectId(userId);

  if (!canEarnAdReward(await countWeekAdRewards(user, league._id, season, week))) {
    return "Ad reward already used this week";
  }

  try {
    await AdReward.create({ user, league: league._id, season, week, transactionId });
    return null;
  } catch {
    // The unique index: Google sent the same view twice, it was already counted
    return "Already counted";
  }
}
