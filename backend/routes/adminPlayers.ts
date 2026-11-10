import express from "express";
import mongoose from "mongoose";

import User from "../models/users";
import { findAdminUser, isAdmin } from "../modules/adminAuth";
import { checkBody } from "../modules/checkBody";
import { extendVip, isVip } from "../modules/vip";

// The players seen by the admins: admin rights, search, and the VIP pass — mounted on /admin (app.ts)
const router = express.Router();

// POST /admin/make-admin — turns an account into an admin account (or back, with isAdmin: false).
// Called once by hand with the secret: the admins then do the rest from the app
router.post("/make-admin", (req, res) => {
  if (!isAdmin(req.body.secret)) {
    res.json({ result: false, error: "Forbidden" });
    return;
  }

  if (!checkBody(req.body, ["email"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const makeAdmin = req.body.isAdmin !== false;

  User.findOneAndUpdate(
    { email: String(req.body.email).trim() },
    { isAdmin: makeAdmin },
    { returnDocument: "after" }
  ).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    res.json({ result: true, username: user.username, isAdmin: user.isAdmin });
  });
});

// What the admin screen shows about a player
function vipInfo(user: InstanceType<typeof User>) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    isVip: isVip(user),
    vipUntil: user.vipUntil,
  };
}

// GET /admin/users/:token?search= — the players whose username or email contains the search (admin screen)
router.get("/users/:token", (req, res) => {
  findAdminUser(req.params.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    const search = String(req.query.search ?? "").trim();

    if (search.length < 2) {
      res.json({ result: true, users: [] });
      return;
    }

    // Escaped: a "." or a "+" typed in the search box is a plain character, not a regex rule
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    User.find({ $or: [{ username: pattern }, { email: pattern }] })
      .sort({ username: 1 })
      .limit(20)
      .then((users) => {
        res.json({ result: true, users: users.map(vipInfo) });
      });
  });
});

// PUT /admin/vip — gives a player some months of VIP pass (added to what's left), or takes it away (months: 0)
router.put("/vip", (req, res) => {
  if (!checkBody(req.body, ["token", "userId"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const months = Number(req.body.months);

  if (!mongoose.isValidObjectId(req.body.userId) || !Number.isInteger(months) || months < 0 || months > 24) {
    res.json({ result: false, error: "Invalid id or months" });
    return;
  }

  findAdminUser(req.body.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    User.findById(req.body.userId).then((user) => {
      if (!user) {
        res.json({ result: false, error: "User not found" });
        return;
      }

      user.vipUntil = months === 0 ? null : extendVip(user.vipUntil, months);

      user.save().then((savedUser) => {
        res.json({ result: true, user: vipInfo(savedUser) });
      });
    });
  });
});

export default router;
