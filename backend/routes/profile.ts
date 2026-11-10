import express from "express";
import bcrypt from "bcrypt";

import Event from "../models/events";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { AVATARS } from "../config/avatars";
import { checkBody } from "../modules/checkBody";
import { findBannedWord } from "../modules/moderation";
import { BONUS_KINDS } from "../modules/scoring";
import type { BonusKind } from "../modules/scoring";
import { computeStats } from "../modules/stats";
import { isVip } from "../modules/vip";
import { deleteUserData } from "../modules/deleteAccount";

const PUSH_PLATFORMS = ["android", "ios", "web"];
const NOTIFICATION_KINDS = ["newGrid", "closingSoon", "results"] as const;

// My account once I'm logged in: profile, stats, push token, notifications, deletion — mounted on /users (app.ts)
const router = express.Router();

// GET /users/me/:token — my profile
router.get("/me/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((data) => {
    if (!data) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    res.json({
      result: true,
      user: {
        username: data.username,
        email: data.email,
        avatar: data.avatar,
        // Read on every visit (not kept in Redux): an admin can change them at any time
        isAdmin: data.isAdmin,
        isVip: isVip(data),
        vipUntil: data.vipUntil,
        // The Profil switches show this
        notifications: data.notifications,
      },
    });
  });
});

// GET /users/me/stats/:token — my stats: % of correct predictions, per sport, and the bonuses that paid off (VIP)
router.get("/me/stats/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    // vipOnly: the app then shows the VIP pass instead of an error
    if (!isVip(user)) {
      res.json({ result: false, error: "The stats are for VIP members", vipOnly: true });
      return;
    }

    Promise.all([
      // My scored predictions, in all my leagues, with the sport of their match
      Prediction.find({ user: user._id, points: { $ne: null } }).populate<{ event: InstanceType<typeof Event> }>(
        "event",
        "sport"
      ),
      // The bonuses I used, and the sabotages that hit me (a bouclier only pays off against one)
      Tactic.find({ actor: user._id, kind: { $in: BONUS_KINDS } }),
      Tactic.find({ target: user._id, kind: "sabotage" }),
    ]).then(([predictions, bonuses, sabotages]) => {
      const stats = computeStats(
        predictions.map((prediction) => ({
          id: String(prediction._id),
          sport: prediction.event?.sport ?? "",
          points: prediction.points ?? 0,
        })),
        bonuses.map((bonus) => ({ kind: bonus.kind as BonusKind, predictionId: String(bonus.prediction) })),
        sabotages.map((sabotage) => String(sabotage.prediction))
      );

      res.json({ result: true, stats });
    });
  });
});

// PUT /users/me — change my username and/or my avatar (Profil tab)
router.put("/me", (req, res) => {
  if (!checkBody(req.body, ["token"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const username = req.body.username !== undefined ? String(req.body.username).trim() : undefined;
  const avatar = req.body.avatar;

  if (username !== undefined && (username.length < 2 || username.length > 20)) {
    res.json({ result: false, error: "Username must be 2 to 20 characters" });
    return;
  }

  if (username !== undefined && findBannedWord(username)) {
    res.json({ result: false, error: "Username contains forbidden words" });
    return;
  }

  if (avatar !== undefined && !AVATARS.includes(avatar)) {
    res.json({ result: false, error: "Invalid avatar" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    // Is the new username already someone else's?
    const usernameTaken = username && username !== user.username ? User.findOne({ username }) : Promise.resolve(null);

    usernameTaken.then((otherUser) => {
      if (otherUser) {
        res.json({ result: false, error: "Username already taken" });
        return;
      }

      if (username) {
        user.username = username;
      }
      if (avatar !== undefined) {
        user.avatar = avatar;
      }

      user.save().then((savedUser) => {
        res.json({
          result: true,
          user: {
            username: savedUser.username,
            email: savedUser.email,
            avatar: savedUser.avatar,
          },
        });
      });
    });
  });
});

// PUT /users/me/push-token — save this device's Expo push token (sent by the app after sign-in)
router.put("/me/push-token", (req, res) => {
  if (!checkBody(req.body, ["token", "pushToken", "platform"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const { pushToken, platform } = req.body;

  if (typeof pushToken !== "string" || !pushToken.startsWith("ExponentPushToken[")) {
    res.json({ result: false, error: "Invalid push token" });
    return;
  }

  if (!PUSH_PLATFORMS.includes(platform)) {
    res.json({ result: false, error: "Invalid platform" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    // One device = one account: if someone else signed in on this phone before, they stop getting its notifications
    // (this also removes it from me, so the $push below never makes a duplicate)
    User.updateMany({ "pushTokens.token": pushToken }, { $pull: { pushTokens: { token: pushToken } } }).then(() => {
      User.updateOne({ _id: user._id }, { $push: { pushTokens: { token: pushToken, platform } } }).then(() => {
        res.json({ result: true });
      });
    });
  });
});

// PUT /users/me/notifications — switch notifications on/off (Profil); only the booleans sent are changed
router.put("/me/notifications", (req, res) => {
  if (!checkBody(req.body, ["token"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    for (const kind of NOTIFICATION_KINDS) {
      if (typeof req.body[kind] === "boolean") {
        user.notifications![kind] = req.body[kind];
      }
    }

    user.save().then((savedUser) => {
      res.json({ result: true, notifications: savedUser.notifications });
    });
  });
});

// DELETE /users/me — deletes my account (RGPD + Google Play). The password is asked again:
// someone holding my unlocked phone must not be able to delete it
router.delete("/me", (req, res) => {
  if (!checkBody(req.body, ["token", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    if (!bcrypt.compareSync(req.body.password, user.password)) {
      res.json({ result: false, error: "Wrong password" });
      return;
    }

    // Their data in the other collections first, then the account itself
    deleteUserData(user._id)
      .then(() => User.deleteOne({ _id: user._id }))
      .then(() => {
        res.json({ result: true });
      });
  });
});

export default router;
