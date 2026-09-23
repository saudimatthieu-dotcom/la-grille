import express from "express";
import Prediction from "../models/Prediction.js";
import Event from "../models/Event.js";
import Grid from "../models/Grid.js";
import checkAuth from "../middlewares/auth.js";

const router = express.Router();

router.post("/", checkAuth, async (req, res) => {
  const { eventId, payload, bonus } = req.body;

  const event = await Event.findById(eventId);
  if (!event) {
    return res.json({ result: false, error: "Event not found" });
  }

  if (new Date() > event.lockAt) {
    return res.json({ result: false, error: "GRID_LOCKED" });
  }

  const grid = await Grid.findOne({ events: eventId });

  const prediction = await Prediction.findOneAndUpdate(
    { user: req.userId, event: eventId },
    { user: req.userId, event: eventId, grid: grid?._id, payload, bonus },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ result: true, prediction });
});

router.get("/grid/:gridId", checkAuth, async (req, res) => {
  const predictions = await Prediction.find({ user: req.userId, grid: req.params.gridId });
  res.json({ result: true, predictions });
});

router.get("/results/:gridId", checkAuth, async (req, res) => {
  const predictions = await Prediction.find({ user: req.userId, grid: req.params.gridId }).populate(
    "event"
  );
  res.json({ result: true, predictions });
});

export default router;
