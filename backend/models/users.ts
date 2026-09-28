import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  token: String,
  avatar: String,
  inventory: {
    doubleur: { type: Number, default: 0 },
    // Starting stock: 1 assurance + 1 bouclier at signup (then bought in the shop, later)
    assurance: { type: Number, default: 1 },
    bouclier: { type: Number, default: 1 },
    sabotage: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("users", userSchema);

export default User;
