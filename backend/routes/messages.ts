import express from "express";
import mongoose from "mongoose";

import League from "../models/leagues";
import Message from "../models/messages";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";

const router = express.Router();

// Finds the user and checks they belong to the league — gives back an error, or the user + league
function checkMember(token: string, leagueId: string) {
  return User.findOne({ token }).then((user) => {
    if (!user) {
      return { error: "User not found" };
    }

    return League.findById(leagueId).then((league) => {
      if (!league) {
        return { error: "League not found" };
      }

      const isMember = league.members.some((member) => member.user?.equals(user._id));

      if (!isMember) {
        return { error: "Not a member of this league" };
      }

      return { user, league };
    });
  });
}

// GET /messages/league/:leagueId/:token?limit=50 — the league chat + system logs (screen 9)
router.get("/league/:leagueId/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.leagueId)) {
    res.json({ result: false, error: "Invalid league id" });
    return;
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);

  checkMember(req.params.token, req.params.leagueId).then((context) => {
    if ("error" in context) {
      res.json({ result: false, error: context.error });
      return;
    }

    // Newest first to keep the last `limit` messages, then reversed so the chat reads top to bottom
    Message.find({ league: context.league._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "username")
      .then((messages) => {
        res.json({ result: true, messages: messages.reverse() });
      });
  });
});

// POST /messages/league/:leagueId — send a chat message
router.post("/league/:leagueId", (req, res) => {
  if (!checkBody(req.body, ["token", "text"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.leagueId)) {
    res.json({ result: false, error: "Invalid league id" });
    return;
  }

  const text = String(req.body.text).trim();

  if (text === "" || text.length > 500) {
    res.json({ result: false, error: "Message must be 1 to 500 characters" });
    return;
  }

  checkMember(req.body.token, req.params.leagueId).then((context) => {
    if ("error" in context) {
      res.json({ result: false, error: context.error });
      return;
    }

    const newMessage = new Message({ league: context.league._id, user: context.user._id, type: "chat", text });

    newMessage.save().then((savedMessage) => {
      savedMessage.populate("user", "username").then((populatedMessage) => {
        res.json({ result: true, message: populatedMessage });
      });
    });
  });
});

export default router;
