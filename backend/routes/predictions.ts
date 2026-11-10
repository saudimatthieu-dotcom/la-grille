import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Grid from "../models/grids";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { findTactics, tacticsOf } from "../modules/leaguePoints";
import { isPlayed } from "../modules/gridTypes";
import { findPicked } from "../modules/selections";
import { seasonState } from "../modules/seasons";
import { findPlayerLeague } from "../modules/publicLeague";
import { BONUS_KINDS } from "../modules/scoring";
import type { BonusKind } from "../modules/scoring";
import { bonusError, bonusStock, findWeekBonuses, saveBonus } from "../modules/bonus";
import { countWeekAdRewards } from "../modules/adRewards";

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

      // Season over: nothing counts until the creator starts the next one
      if (seasonState(league) === "ending" || seasonState(league) === "finished") {
        res.json({ result: false, error: "The season is over: waiting for the league's creator to start the next one" });
        return;
      }

      // The matches picked by hand for this league that week (admins, or the sur-mesure owner) — null: no match
      findPicked(league, grid.season, grid.week).then((picked) => {
        if (!isPlayed(event, picked)) {
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
        Promise.all([
          Prediction.findOne(filter),
          findWeekBonuses(user._id, league._id, grid.season, grid.week),
          countWeekAdRewards(user._id, league._id, grid.season, grid.week),
        ]).then(
          ([existing, tactics, adDoubleurs]) => {
            const error = bonus
              ? bonusError(bonus, league.isPublic, event.sport ?? "", bonusStock(tactics, existing?._id, adDoubleurs))
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

export default router;
