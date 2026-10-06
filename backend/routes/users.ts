import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import uid2 from "uid2";

import Event from "../models/events";
import Prediction from "../models/predictions";
import Tactic from "../models/tactics";
import User from "../models/users";
import { AVATARS } from "../config/avatars";
import { checkBody } from "../modules/checkBody";
import { joinPublicLeague } from "../modules/publicLeague";
import { BONUS_KINDS } from "../modules/scoring";
import type { BonusKind } from "../modules/scoring";
import { sendResetCode } from "../modules/sendResetCode";
import { computeStats } from "../modules/stats";

const RESET_CODE_MINUTES = 15;
const RESET_MAX_ATTEMPTS = 5;

const router = express.Router();

router.post("/signup", (req, res) => {
  if (!checkBody(req.body, ["username", "email", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] }).then((data) => {
    if (data) {
      res.json({ result: false, error: "Username or email already taken" });
      return;
    }

    const hash = bcrypt.hashSync(req.body.password, 10);

    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hash,
      token: uid2(32),
    });

    newUser.save().then((newDoc) => {
      // Joined before answering: the home screen shows the public league right after signup
      joinPublicLeague(newDoc._id).then(() => {
        res.json({
          result: true,
          token: newDoc.token,
          user: {
            username: newDoc.username,
            email: newDoc.email,
            avatar: newDoc.avatar,
          },
        });
      });
    });
  });
});

router.post("/signin", (req, res) => {
  if (!checkBody(req.body, ["email", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ email: req.body.email }).then((data) => {
    if (data && bcrypt.compareSync(req.body.password, data.password)) {
      // Accounts created before the public league existed join it here
      joinPublicLeague(data._id).then(() => {
        res.json({
          result: true,
          token: data.token,
          user: {
            username: data.username,
            email: data.email,
            avatar: data.avatar,
          },
        });
      });
    } else {
      res.json({ result: false, error: "Wrong email or password" });
    }
  });
});

// POST /users/forgot-password — emails a 6-digit code to reset the password
router.post("/forgot-password", (req, res) => {
  if (!checkBody(req.body, ["email"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ email: String(req.body.email).trim() }).then((user) => {
    // Same answer whether the email exists or not: nobody can use this to find out who has an account
    if (!user) {
      res.json({ result: true });
      return;
    }

    // crypto.randomInt is unpredictable, unlike Math.random
    const code = String(crypto.randomInt(100000, 1000000));

    user.resetCode = bcrypt.hashSync(code, 10);
    user.resetExpires = new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000);
    user.resetAttempts = 0;

    user.save().then(() => {
      sendResetCode(user.email, code).then(() => {
        res.json({ result: true });
      });
    });
  });
});

// POST /users/reset-password — checks the code, saves the new password and logs the user in
router.post("/reset-password", (req, res) => {
  if (!checkBody(req.body, ["email", "code", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ email: String(req.body.email).trim() }).then((user) => {
    const isUsable =
      user &&
      user.resetCode &&
      user.resetExpires &&
      user.resetExpires > new Date() &&
      user.resetAttempts < RESET_MAX_ATTEMPTS;

    if (!user || !isUsable) {
      res.json({ result: false, error: "Invalid or expired code" });
      return;
    }

    if (!bcrypt.compareSync(String(req.body.code), user.resetCode as string)) {
      // Counts wrong tries, so the 1,000,000 possible codes can't all be tested
      user.resetAttempts += 1;
      user.save().then(() => {
        res.json({ result: false, error: "Invalid or expired code" });
      });
      return;
    }

    user.password = bcrypt.hashSync(req.body.password, 10);
    // A new token logs out every other phone that used the old password
    user.token = uid2(32);
    user.resetCode = null;
    user.resetExpires = null;
    user.resetAttempts = 0;

    user.save().then((savedUser) => {
      res.json({
        result: true,
        token: savedUser.token,
        user: {
          username: savedUser.username,
          email: savedUser.email,
          avatar: savedUser.avatar,
        },
      });
    });
  });
});

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
      },
    });
  });
});

// GET /users/me/stats/:token — my stats: % of correct predictions, per sport, and the bonuses that paid off
router.get("/me/stats/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
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

export default router;
