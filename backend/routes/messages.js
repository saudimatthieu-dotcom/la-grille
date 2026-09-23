import express from "express";
import Message from "../models/Message.js";
import checkAuth from "../middlewares/auth.js";

const router = express.Router();

router.get("/league/:id", checkAuth, async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const messages = await Message.find({ league: req.params.id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "username avatar");

  res.json({ result: true, messages: messages.reverse() });
});

router.post("/league/:id", checkAuth, async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.json({ result: false, error: "Missing parameters" });
  }

  const message = await Message.create({
    league: req.params.id,
    user: req.userId,
    type: "chat",
    text,
  });

  res.json({ result: true, message });
});

export default router;
