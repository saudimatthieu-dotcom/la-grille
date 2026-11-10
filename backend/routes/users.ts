import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import uid2 from "uid2";

import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { findBannedWord } from "../modules/moderation";
import { joinPublicLeague } from "../modules/publicLeague";
import { sendResetCode } from "../modules/sendResetCode";

const RESET_CODE_MINUTES = 15;
const RESET_MAX_ATTEMPTS = 5;

const router = express.Router();

router.post("/signup", (req, res) => {
  if (!checkBody(req.body, ["username", "email", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  // The "15 ans ou plus + CGU" box: without it, no account. A real `true`, not just any filled value
  if (req.body.acceptedTerms !== true) {
    res.json({ result: false, error: "You must accept the terms" });
    return;
  }

  if (findBannedWord(String(req.body.username))) {
    res.json({ result: false, error: "Username contains forbidden words" });
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
      termsAcceptedAt: new Date(),
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
      sendResetCode(user.email, code)
        .then(() => {
          res.json({ result: true });
        })
        // Without this, an email service down leaves the app waiting with no answer
        .catch(() => res.json({ result: false, error: "Could not send the email, try again later" }));
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

export default router;
