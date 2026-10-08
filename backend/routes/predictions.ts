import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getSeason, getWeek } from "../modules/getWeek";
import { buildRanking } from "../modules/ranking";
import { findTactics, getSeasonPoints, getWeekPoints, tacticsOf } from "../modules/leaguePoints";
import { isPlayed } from "../modules/gridTypes";
import { findPicked } from "../modules/selections";
import { findPlayerLeague } from "../modules/publicLeague";
import { BONUS_KINDS, pointsInLeague } from "../modules/scoring";
import type { BonusKind } from "../modules/scoring";
import { bonusError, bonusStock, findWeekBonuses, saveBonus } from "../modules/bonus";

const router = express.Router();

// POST /predictions — create or update my prediction for one event, in one league, with its bonus
// (no leagueId: the public league — the Grille tab)
router.post("/", (req, res) => {
  if (!checkBody(req.body, ["token", "gridId", "eventId", "payload"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const leagueId = req.body.leagueId;
  // undefined: the bonus isn't touched — null: no bonus on this prediction
  const bonus: BonusKind | null | undefined = req.body.bonus;

  if (bonus && !BONUS_KINDS.includes(bonus)) {
    res.json({ result: false, error: "Invalid bonus" });
    return;
  }

  if (
    !mongoose.isValidObjectId(req.body.gridId) ||
    !mongoose.isValidObjectId(req.body.eventId) ||
    (leagueId && !mongoose.isValidObjectId(leagueId))
  ) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Promise.all([
      Event.findById(req.body.eventId),
      findPlayerLeague(leagueId, user._id),
      Grid.findById(req.body.gridId),
    ]).then(([event, league, grid]) => {
      if (!event) {
        res.json({ result: false, error: "Event not found" });
        return;
      }

      if (!league) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      if (!grid) {
        res.json({ result: false, error: "Grid not found" });
        return;
      }

      // The matches picked by hand for this league that week (admins, or the sur-mesure owner) — null: automatic
      findPicked(league, grid.season, grid.week).then((picked) => {
        if (!isPlayed(league.gridType, event, picked)) {
          res.json({ result: false, error: "This match isn't in this league's grid" });
          return;
        }

        if (!event.lockAt || event.lockAt <= new Date()) {
          res.json({ result: false, error: "Predictions are closed for this event" });
          return;
        }

        // { user, event, league }: my prediction on this match in THIS league — my other leagues keep theirs
        const filter = { user: user._id, event: event._id, league: league._id };

        const savePrediction = () =>
          Prediction.findOneAndUpdate(
            filter,
            { grid: grid._id, payload: req.body.payload },
            { upsert: true, returnDocument: "after" }
          );

        // No bonus to save (an older app, or the public league with none chosen): just the prediction
        if (bonus === undefined || (league.isPublic && !bonus)) {
          savePrediction()
            .then((prediction) => {
              res.json({ result: true, prediction });
            })
            // Without this, a database refusal (e.g. a unique index) leaves the app waiting with no answer
            .catch(() => res.json({ result: false, error: "Could not save the prediction" }));
          return;
        }

        // The bonus is checked BEFORE anything is saved: a refused bonus doesn't leave a prediction saved without it
        Promise.all([Prediction.findOne(filter), findWeekBonuses(user._id, league._id, grid.season, grid.week)]).then(
          ([existing, tactics]) => {
            const error = bonus
              ? bonusError(bonus, league.isPublic, event.sport ?? "", bonusStock(tactics, existing?._id))
              : null;

            if (error) {
              res.json({ result: false, error });
              return;
            }

            savePrediction()
              .then((prediction) => {
                if (!prediction) {
                  res.json({ result: false, error: "Could not save the prediction" });
                  return;
                }

                const kind = bonus ?? null;

                return saveBonus({ user, league, grid, event, predictionId: prediction._id, tactics, kind }).then(() => {
                  res.json({ result: true, prediction: { ...prediction.toObject(), bonus: kind } });
                });
              })
              .catch(() => res.json({ result: false, error: "Could not save the prediction" }));
          }
        );
      });
    });
  });
});

// GET /predictions/grid/:gridId/:token?leagueId= — my predictions for one grid, in one league (none: the public league)
router.get("/grid/:gridId/:token", (req, res) => {
  const leagueId = req.query.leagueId;

  if (!mongoose.isValidObjectId(req.params.gridId) || (leagueId && !mongoose.isValidObjectId(leagueId))) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    findPlayerLeague(leagueId, user._id).then((league) => {
      if (!league) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      Prediction.find({ user: user._id, grid: req.params.gridId, league: league._id }).then((predictions) => {
        findTactics(
          league._id,
          predictions.map((prediction) => prediction._id)
        ).then((tactics) => {
          // Each prediction with the bonus I put on it here (null: none) — the grid shows its icon
          const withBonus = predictions.map((prediction) => {
            const { bonus } = tacticsOf(tactics, prediction._id);
            return { ...prediction.toObject(), bonus: BONUS_KINDS.find((kind) => bonus[kind]) ?? null };
          });

          res.json({ result: true, predictions: withBonus });
        });
      });
    });
  });
});

// GET /predictions/results/:gridId/:token?leagueId= — my finished matches and my points in one league (screen 10)
// No leagueId: the public league (the Grille tab) — its raw points are the general ranking
router.get("/results/:gridId/:token", (req, res) => {
  const leagueId = req.query.leagueId;

  if (!mongoose.isValidObjectId(req.params.gridId) || (leagueId && !mongoose.isValidObjectId(leagueId))) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Promise.all([
      Grid.findById(req.params.gridId).populate<{ events: InstanceType<typeof Event>[] }>("events"),
      findPlayerLeague(leagueId, user._id),
    ]).then(([grid, league]) => {
      if (!grid) {
        res.json({ result: false, error: "Grid not found" });
        return;
      }

      if (!league) {
        res.json({ result: false, error: "Not a member of this league" });
        return;
      }

      // An old week (opened from the Semaine tab's arrows) or this one
      const season = grid.season ?? 0;
      const week = grid.week ?? 0;
      const isThisWeek = season === getSeason(new Date()) && week === getWeek(new Date());

      Prediction.find({ user: user._id, grid: grid._id, league: league._id }).then((predictions) => {
        Promise.all([
          findTactics(
            league._id,
            predictions.map((prediction) => prediction._id)
          ),
          getWeekPoints(league, season, week),
          User.find({ _id: { $in: league.members.map((member) => member.user) } }),
          findPicked(league, season, week),
        ]).then(([tactics, weekPoints, users, picked]) => {
          // Each finished match of this league's grid, with what I predicted there and what it gave me
          const results = grid.events
            .filter((event) => event.status === "finished" && isPlayed(league.gridType, event, picked))
            .map((event) => {
              const prediction = predictions.find((item) => item.event?.equals(event._id));
              const { bonus, sabotage } = tacticsOf(tactics, prediction?._id);
              const rawPoints = prediction?.points ?? null;

              return {
                event,
                payload: prediction?.payload ?? null,
                bonus,
                points: rawPoints === null ? null : pointsInLeague(rawPoints, event.sport, bonus, Boolean(sabotage)),
                sabotaged: Boolean(sabotage),
                shieldTriggered: sabotage?.shieldTriggered ?? false,
              };
            });

          const myId = String(user._id);

          // An old week: no rank move — "before → after" that week would need every week played since
          if (!isThisWeek) {
            res.json({
              result: true,
              leagueName: league.name,
              season,
              week,
              isThisWeek,
              results,
              weekPoints: weekPoints[myId] ?? 0,
              rankBefore: null,
              rankNow: null,
              passed: [],
            });
            return;
          }

          // Rank before this week = the season total minus this week's points
          const members = users.map((member) => ({ userId: String(member._id), username: member.username }));
          const seasonPoints = getSeasonPoints(league);
          const pointsBefore: Record<string, number> = {};
          Object.keys(seasonPoints).forEach((userId) => {
            pointsBefore[userId] = seasonPoints[userId] - (weekPoints[userId] ?? 0);
          });

          const rankingNow = buildRanking(members, seasonPoints);
          const rankingBefore = buildRanking(members, pointsBefore);
          const rankNow = rankingNow.find((row) => row.userId === myId)?.rank ?? 1;
          const rankBefore = rankingBefore.find((row) => row.userId === myId)?.rank ?? 1;

          // The players who were ahead of me before this week and are now behind me
          const passed = rankingBefore
            .filter((row) => row.userId !== myId && row.rank < rankBefore)
            .filter((row) => (rankingNow.find((now) => now.userId === row.userId)?.rank ?? 0) > rankNow)
            .map((row) => row.username);

          res.json({
            result: true,
            leagueName: league.name,
            season,
            week,
            isThisWeek,
            results,
            weekPoints: weekPoints[myId] ?? 0,
            rankBefore,
            rankNow,
            passed,
          });
        });
      });
    });
  });
});

export default router;
