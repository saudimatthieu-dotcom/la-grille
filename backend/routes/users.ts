import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import uid2 from "uid2";

import User from "../models/users";
import { AVATARS } from "../config/avatars";
import { checkBody } from "../modules/checkBody";
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
            inventory: newDoc.inventory,
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
            inventory: data.inventory,
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
          inventory: savedUser.inventory,
        },
      });
    });
  });
});

// GET /users/me/:token — my profile, with an up-to-date inventory
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
        inventory: data.inventory,
      },
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
            inventory: savedUser.inventory,
          },
        });
      });
    });
  });
});

export default router;
