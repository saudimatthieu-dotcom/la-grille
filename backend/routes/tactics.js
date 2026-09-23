import express from "express";
import Prediction from "../models/Prediction.js";
import User from "../models/User.js";
import League from "../models/League.js";
import Tactic from "../models/Tactic.js";
import checkAuth from "../middlewares/auth.js";
import { getWeek } from "../utils/getWeek.js";

const router = express.Router();

const applyBonus = (kind) => async (req, res) => {
  const { predictionId } = req.body;

  const prediction = await Prediction.findById(predictionId);
  if (!prediction || prediction.user.toString() !== req.userId) {
    return res.json({ result: false, error: "Prediction not found" });
  }

  const user = await User.findById(req.userId);
  if (!user.inventory[kind]) {
    return res.json({ result: false, error: "NO_BONUS_LEFT" });
  }

  user.inventory[kind] -= 1;
  await user.save();

  prediction.bonus[kind] = true;
  await prediction.save();

  res.json({ result: true, prediction });
};

router.post("/doubler", checkAuth, applyBonus("doubleur"));
router.post("/shield", checkAuth, applyBonus("bouclier"));
router.post("/insurance", checkAuth, applyBonus("assurance"));

router.post("/sabotage", checkAuth, async (req, res) => {
  const { leagueId, targetUserId, eventId } = req.body;

  const league = await League.findById(leagueId);
  if (!league) {
    return res.json({ result: false, error: "League not found" });
  }

  const isMember = league.members.some((m) => m.user.toString() === req.userId);
  if (!isMember) {
    return res.json({ result: false, error: "NOT_MEMBER" });
  }

  const sorted = [...league.members].sort((a, b) => b.points - a.points);
  const lastPlace = sorted[sorted.length - 1];
  if (lastPlace.user.toString() !== req.userId) {
    return res.json({ result: false, error: "NOT_LAST_PLACE" });
  }

  if (new Date().getDay() !== 1) {
    return res.json({ result: false, error: "SABOTAGE_WRONG_DAY" });
  }

  const week = getWeek();
  const alreadyUsed = await Tactic.findOne({
    league: leagueId,
    actor: req.userId,
    kind: "sabotage",
    week,
  });
  if (alreadyUsed) {
    return res.json({ result: false, error: "SABOTAGE_ALREADY_USED" });
  }

  const user = await User.findById(req.userId);
  if (!user.inventory.sabotage) {
    return res.json({ result: false, error: "NO_BONUS_LEFT" });
  }

  const targetPrediction = await Prediction.findOne({ user: targetUserId, event: eventId });
  if (!targetPrediction) {
    return res.json({ result: false, error: "Target prediction not found" });
  }

  if (targetPrediction.bonus.bouclier) {
    targetPrediction.shieldTriggered = true;
  } else {
    targetPrediction.sabotagedBy = req.userId;
  }
  await targetPrediction.save();

  user.inventory.sabotage -= 1;
  await user.save();

  await Tactic.create({
    league: leagueId,
    week,
    actor: req.userId,
    target: targetUserId,
    kind: "sabotage",
    prediction: targetPrediction._id,
    resolved: true,
  });

  res.json({ result: true, shieldTriggered: targetPrediction.shieldTriggered });
});

export default router;
