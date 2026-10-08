import Event from "../models/events";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import User from "../models/users";
import { getMonday } from "./getWeek";
import { getSeasonPoints } from "./leaguePoints";
import { buildRanking } from "./ranking";

// The client's rule: a private league's season lasts 10 weeks — a VIP creator chooses between 4 and 30
export const DEFAULT_SEASON_WEEKS = 10;
export const MIN_SEASON_WEEKS = 4;
export const MAX_SEASON_WEEKS = 30;

// If a match never gets its result (API down…), the season still closes this many days after its end
const MAX_WAIT_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

type SeasonLeague = {
  isPublic?: boolean | null;
  seasonStatus?: string | null;
  seasonStartsAt?: Date | null;
  seasonWeeks?: number | null;
};

// Monday 00:00 after the season's last week
export function seasonEndsAt(league: SeasonLeague) {
  if (!league.seasonStartsAt) {
    return null;
  }

  const end = new Date(league.seasonStartsAt);
  end.setDate(end.getDate() + (league.seasonWeeks ?? DEFAULT_SEASON_WEEKS) * 7);
  return end;
}

// "running": predictions open — "ending": the weeks are over, the last matches are being scored —
// "finished": podium saved, waiting for the creator. null: the public league, which has no season
export function seasonState(league: SeasonLeague, now = new Date()) {
  if (league.isPublic) {
    return null;
  }

  if (league.seasonStatus === "finished") {
    return "finished";
  }

  const end = seasonEndsAt(league);
  return end && now >= end ? "ending" : "running";
}

// Which week of the season we're in: 1 to seasonWeeks
export function seasonWeekIndex(league: SeasonLeague, now = new Date()) {
  if (!league.seasonStartsAt) {
    return 1;
  }

  const weeks = league.seasonWeeks ?? DEFAULT_SEASON_WEEKS;
  const index = Math.floor((now.getTime() - league.seasonStartsAt.getTime()) / (7 * DAY_MS)) + 1;
  return Math.min(Math.max(index, 1), weeks);
}

// The length a creator asked for: theirs if VIP and between 4 and 30, otherwise the default 10 — null: not a number
export function seasonLength(requested: unknown, isVipCreator: boolean) {
  if (requested === undefined || requested === null || requested === "" || !isVipCreator) {
    return DEFAULT_SEASON_WEEKS;
  }

  const weeks = Number(requested);
  return Number.isInteger(weeks) && weeks >= MIN_SEASON_WEEKS && weeks <= MAX_SEASON_WEEKS ? weeks : null;
}

// "🏆 Fin de la saison 2 ! 🥇 Thomas 54 pts · 🥈 Paul 40 pts · 🥉 Léa 31 pts"
export function formatPodium(number: number, podium: { username: string; points: number; rank: number }[]) {
  const medals = ["🥇", "🥈", "🥉"];
  const lines = podium.map((row) => `${medals[row.rank - 1] ?? ""} ${row.username} ${row.points} pts`);
  return `🏆 Fin de la saison ${number} ! ${lines.join(" · ")}`;
}

// Closes every private league whose season is over: podium saved and announced, points back to 0, predictions
// paused until the creator starts the next season. Called by /admin/score — gives back how many were closed
export function finishSeasons() {
  const now = new Date();

  // Leagues from before seasons existed: their first season starts this week
  return League.updateMany({ isPublic: { $ne: true }, seasonStartsAt: null }, { seasonStartsAt: getMonday(now) })
    .then(() => League.find({ isPublic: { $ne: true }, seasonStatus: "running" }))
    .then((leagues) => {
      const ended = leagues.filter((league) => seasonState(league, now) === "ending");

      return Promise.all(ended.map((league) => finishIfScored(league, now))).then(
        (closed) => closed.filter(Boolean).length
      );
    });
}

function finishIfScored(league: InstanceType<typeof League>, now: Date) {
  const end = seasonEndsAt(league) as Date;

  // A match of the season still waiting for its points: the final ranking isn't known yet
  return Prediction.find({ league: league._id, points: null })
    .populate<{ event: InstanceType<typeof Event> }>("event", "startsAt status")
    .then((unscored) => {
      const isWaiting = unscored.some(
        (prediction) =>
          prediction.event?.startsAt && prediction.event.startsAt < end && prediction.event.status !== "cancelled"
      );

      if (isWaiting && now.getTime() < end.getTime() + MAX_WAIT_DAYS * DAY_MS) {
        return false;
      }

      return User.find({ _id: { $in: league.members.map((member) => member.user) } }).then((users) => {
        const members = users.map((user) => ({ userId: String(user._id), username: user.username }));
        const ranking = buildRanking(members, getSeasonPoints(league));

        // The podium: ranks 1 to 3, ties included — nobody with 0 points
        const podium = ranking
          .filter((row) => row.rank <= 3 && row.points > 0)
          .map((row) => ({ user: row.userId, username: row.username, points: row.points, rank: row.rank }));

        const number = league.seasonNumber ?? 1;

        league.pastSeasons.push({
          number,
          startsAt: league.seasonStartsAt,
          endsAt: end,
          weeks: league.seasonWeeks,
          podium,
        });
        league.members.forEach((member) => {
          member.points = 0;
        });
        league.seasonStatus = "finished";

        const text =
          podium.length > 0
            ? `${formatPodium(number, podium)}. Le créateur de la ligue peut lancer la saison suivante.`
            : `🏁 Fin de la saison ${number}. Le créateur de la ligue peut lancer la saison suivante.`;

        return league
          .save()
          .then(() => new Message({ league: league._id, type: "system", text, meta: { kind: "season", number } }).save())
          .then(() => true);
      });
    });
}
