import express from "express";
import Grid from "../models/Grid.js";
import Event from "../models/Event.js";
import Prediction from "../models/Prediction.js";
import checkAuth from "../middlewares/auth.js";
import checkAdmin from "../middlewares/checkAdmin.js";

const router = express.Router();

router.get("/league/:leagueId/current", checkAuth, async (req, res) => {
  const grid = await Grid.findOne({ league: req.params.leagueId })
    .sort({ createdAt: -1 })
    .populate("events");

  if (!grid) {
    return res.json({ result: false, error: "No grid found" });
  }

  const predictions = await Prediction.find({ user: req.userId, grid: grid._id });

  res.json({
    result: true,
    grid,
    predictions,
    filled: `${predictions.length}/${grid.events.length}`,
  });
});

router.post("/league/:leagueId/generate", checkAdmin, async (req, res) => {
  const { season, week } = req.body;
  if (!season || !week) {
    return res.json({ result: false, error: "Missing parameters" });
  }

  const events = await Event.find({ status: "scheduled" })
    .sort({ popularity: -1 })
    .limit(10);

  if (events.length === 0) {
    return res.json({ result: false, error: "No events available" });
  }

  const lockAt = events.reduce(
    (min, event) => (event.lockAt < min ? event.lockAt : min),
    events[0].lockAt
  );

  const grid = await Grid.create({
    league: req.params.leagueId,
    season,
    week,
    events: events.map((e) => e._id),
    lockAt,
    status: "open",
  });

  res.json({ result: true, grid });
});

export default router;
