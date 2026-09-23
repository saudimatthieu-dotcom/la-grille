import express from "express";
import Grid from "../models/Grid.js";
import Prediction from "../models/Prediction.js";
import League from "../models/League.js";
import checkAdmin from "../middlewares/checkAdmin.js";

const router = express.Router();

router.post("/sync-events", checkAdmin, async (req, res) => {
  res.json({ result: false, error: "Not implemented — needs a provider from docs/04-apis-gratuites.md" });
});

router.post("/sync-results", checkAdmin, async (req, res) => {
  res.json({ result: false, error: "Not implemented — needs a provider from docs/04-apis-gratuites.md" });
});

router.post("/score", checkAdmin, async (req, res) => {
  const { gridId } = req.body;
  const grid = await Grid.findById(gridId);
  if (!grid) {
    return res.json({ result: false, error: "Grid not found" });
  }

  const predictions = await Prediction.find({ grid: gridId }).populate("event");

  for (const prediction of predictions) {
    if (prediction.points !== null || prediction.event.status !== "finished") continue;

    const isExactMatch = JSON.stringify(prediction.payload) === JSON.stringify(prediction.event.result);
    let points = isExactMatch ? 10 : 0;
    if (prediction.bonus.doubleur) points *= 2;

    prediction.points = points;
    prediction.scoredAt = new Date();
    await prediction.save();
  }

  grid.status = "scored";
  await grid.save();

  const league = await League.findById(grid.league);
  for (const member of league.members) {
    const memberPoints = predictions
      .filter((p) => p.user.toString() === member.user.toString())
      .reduce((sum, p) => sum + (p.points || 0), 0);
    member.points += memberPoints;
  }
  await league.save();

  res.json({ result: true });
});

router.post("/weekly-reset", checkAdmin, async (req, res) => {
  res.json({ result: false, error: "Not implemented yet" });
});

export default router;
