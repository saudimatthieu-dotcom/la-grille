import express from "express";
import mongoose from "mongoose";

import League from "../models/leagues";
import Message from "../models/messages";
import Report, { REPORT_REASONS } from "../models/reports";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { notifyChat } from "../modules/chatPush";
import { findBannedWord } from "../modules/moderation";
import { PRIVATE_CATEGORIES, PUBLIC_CATEGORIES } from "../config/bannedWords";

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

      // Used by both chat routes: one check closes the chat of the public league for reading and sending
      if (league.isPublic) {
        return { error: "No chat in the public league" };
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
      .populate("user", "username avatar")
      .then((messages) => {
        // My bell in the Chat tab: do I get a push for each message of this league?
        const me = context.league.members.find((member) => member.user?.equals(context.user._id));

        res.json({ result: true, messages: messages.reverse(), chatNotifications: me?.chatNotifications !== false });
      });
  });
});

// PUT /messages/league/:leagueId/notifications — switch the push for this league's chat on/off (the bell)
router.put("/league/:leagueId/notifications", (req, res) => {
  if (!checkBody(req.body, ["token"]) || typeof req.body.enabled !== "boolean") {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.leagueId)) {
    res.json({ result: false, error: "Invalid league id" });
    return;
  }

  checkMember(req.body.token, req.params.leagueId).then((context) => {
    if ("error" in context) {
      res.json({ result: false, error: context.error });
      return;
    }

    League.updateOne(
      { _id: context.league._id, "members.user": context.user._id },
      { $set: { "members.$.chatNotifications": req.body.enabled } }
    ).then(() => {
      res.json({ result: true, chatNotifications: req.body.enabled });
    });
  });
});

// GET /messages/latest/:token — the latest game news (system log) from all my leagues (home screen)
router.get("/latest/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    League.find({ "members.user": user._id }).then((leagues) => {
      Message.findOne({ league: { $in: leagues.map((league) => league._id) }, type: "system" })
        .sort({ createdAt: -1 })
        .then((message) => {
          const league = leagues.find((item) => message?.league && item._id.equals(message.league));

          res.json({
            result: true,
            latest: message ? { text: message.text, leagueId: league?._id, leagueName: league?.name } : null,
          });
        });
    });
  });
});

// POST /messages/report/:messageId — a member reports a chat message of their league (DSA: a way to flag abuse)
router.post("/report/:messageId", (req, res) => {
  if (!checkBody(req.body, ["token", "reason"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.messageId)) {
    res.json({ result: false, error: "Invalid message id" });
    return;
  }

  if (!(REPORT_REASONS as readonly string[]).includes(req.body.reason)) {
    res.json({ result: false, error: "Invalid reason" });
    return;
  }

  Message.findById(req.params.messageId).then((message) => {
    // Only what a player wrote can be reported, not the game's own logs
    if (!message || message.type !== "chat") {
      res.json({ result: false, error: "Message not found" });
      return;
    }

    checkMember(req.body.token, String(message.league)).then((context) => {
      if ("error" in context) {
        res.json({ result: false, error: context.error });
        return;
      }

      if (message.user?.equals(context.user._id)) {
        res.json({ result: false, error: "You can't report your own message" });
        return;
      }

      // Once per player and message: reporting again keeps the first report
      Report.updateOne(
        { message: message._id, reporter: context.user._id },
        { $setOnInsert: { league: message.league, reason: req.body.reason } },
        { upsert: true }
      ).then(() => {
        res.json({ result: true });
      });
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

    // Friends can chambrer in a private league (insults allowed), never harass or threaten
    if (findBannedWord(text, context.league.isPublic ? PUBLIC_CATEGORIES : PRIVATE_CATEGORIES)) {
      res.json({ result: false, error: "Message contains forbidden words" });
      return;
    }

    const newMessage = new Message({ league: context.league._id, user: context.user._id, type: "chat", text });

    newMessage.save().then((savedMessage) => {
      savedMessage.populate("user", "username avatar").then((populatedMessage) => {
        res.json({ result: true, message: populatedMessage });
      });

      // After answering: the sender doesn't wait for the pushes, and a push failure never loses the message
      notifyChat(context.league, context.user, text).catch((error) => console.log("Chat push failed:", error));
    });
  });
});

export default router;
