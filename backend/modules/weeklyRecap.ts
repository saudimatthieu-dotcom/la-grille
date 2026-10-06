import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import User from "../models/users";
import { getWeekStart } from "./getWeek";
import { isInGrid } from "./gridTypes";
import { getWeekPoints } from "./leaguePoints";
import { buildRanking } from "./ranking";

type EventDoc = InstanceType<typeof Event>;

// Beyond that, the message would be too long for the chat
const RECAP_MAX_PLAYERS = 10;

// "📊 Semaine 41 : Thomas 12 pts, Paul 8 pts, Léa 3 pts" — ranking = already sorted, best first
export function formatRecap(week: number, ranking: { username: string; points: number }[]) {
  const lines = ranking.slice(0, RECAP_MAX_PLAYERS).map((row) => `${row.username} ${row.points} pts`);
  const more = ranking.length > RECAP_MAX_PLAYERS ? ", …" : "";

  return `📊 Semaine ${week} : ${lines.join(", ")}${more}`;
}

// A match is over when it's finished — or cancelled: it will never be played
function isOver(event: EventDoc) {
  return event.status === "finished" || event.status === "cancelled";
}

// Posts the week's recap in the chat of every private league that played it — once per week:
// when the week is over (Monday) and all its matches are finished, then the grid is marked "scored"
export function postWeeklyRecaps() {
  return Grid.find({ status: { $ne: "scored" } })
    .populate<{ events: EventDoc[] }>("events")
    .then((grids) => {
      const now = new Date();

      // Matches are added to a grid during its week: before the week ends, a later match could still join it
      const finishedGrids = grids.filter((grid) => {
        const weekEnd = getWeekStart(grid.season ?? 0, grid.week ?? 0);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return weekEnd <= now && grid.events.every(isOver);
      });

      const recaps = finishedGrids.map((grid) =>
        // The leagues where someone predicted this week — the public league has no chat
        Prediction.distinct("league", { grid: grid._id }).then((leagueIds) =>
          League.find({ _id: { $in: leagueIds }, isPublic: { $ne: true } }).then((leagues) => {
            const messages = leagues
              // A league whose type had no match this week has nothing to sum up
              .filter((league) => grid.events.some((event) => isInGrid(league.gridType, event)))
              .map((league) =>
                Promise.all([
                  getWeekPoints(league, grid.season ?? 0, grid.week ?? 0),
                  User.find({ _id: { $in: league.members.map((member) => member.user) } }),
                ]).then(([weekPoints, users]) => {
                  const members = users.map((user) => ({ userId: String(user._id), username: user.username }));
                  const ranking = buildRanking(members, weekPoints);

                  return {
                    league: league._id,
                    type: "system",
                    text: formatRecap(grid.week ?? 0, ranking),
                    meta: { kind: "recap", season: grid.season, week: grid.week },
                  };
                })
              );

            return Promise.all(messages)
              .then((recapMessages) => Message.insertMany(recapMessages))
              .then(() => Grid.updateOne({ _id: grid._id }, { status: "scored" }));
          })
        )
      );

      return Promise.all(recaps).then(() => finishedGrids.length);
    });
}
