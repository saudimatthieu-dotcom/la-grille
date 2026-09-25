import express from "express";
import bcrypt from "bcrypt";
import uid2 from "uid2";

import User from "../models/users";
import { checkBody } from "../modules/checkBody";

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

router.post("/signin", (req, res) => {
  if (!checkBody(req.body, ["email", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ email: req.body.email }).then((data) => {
    if (data && bcrypt.compareSync(req.body.password, data.password)) {
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
    } else {
      res.json({ result: false, error: "Wrong email or password" });
    }
  });
});

export default router;
