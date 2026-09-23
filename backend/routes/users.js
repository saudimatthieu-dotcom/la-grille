import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import checkAuth from "../middlewares/auth.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.json({ result: false, error: "Missing parameters" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.json({ result: false, error: "User already exists" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = await User.create({ username, email, password: hashedPassword });

  const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({
    result: true,
    token,
    user: { username: newUser.username, email: newUser.email },
  });
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.json({ result: false, error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({
    result: true,
    token,
    user: { username: user.username, email: user.email },
  });
});

router.get("/me", checkAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  res.json({
    result: true,
    user: {
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      inventory: user.inventory,
    },
  });
});

router.put("/me", checkAuth, async (req, res) => {
  const { avatar, username } = req.body;
  const user = await User.findByIdAndUpdate(
    req.userId,
    { avatar, username },
    { new: true }
  );
  res.json({
    result: true,
    user: { username: user.username, email: user.email, avatar: user.avatar },
  });
});

export default router;
