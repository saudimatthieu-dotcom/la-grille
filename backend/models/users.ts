import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  token: String,
  avatar: String,
  // Season total on the general grid (the general ranking) — no bonus and no sabotage here
  points: { type: Number, default: 0 },
  // Admins pick the matches of the officielle, classique and exotique grids, and hand out the VIP pass
  isAdmin: { type: Boolean, default: false },
  // VIP pass: active until this date (null: never had it) — given by an admin until in-app payment exists
  vipUntil: { type: Date, default: null },
  // Forgot password: the 6-digit code is stored hashed (like the password), valid 15 min, 5 tries max
  resetCode: { type: String, default: null },
  resetExpires: { type: Date, default: null },
  resetAttempts: { type: Number, default: 0 },
  // Expo push tokens: one per device (phone, tablet, later the website) — a list so a new device doesn't replace the old one
  pushTokens: [{ _id: false, token: String, platform: String }],
  // Which notifications the user wants (switches in Profil) — all on by default
  notifications: {
    newGrid: { type: Boolean, default: true },
    closingSoon: { type: Boolean, default: true },
    results: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("users", userSchema);

export default User;
