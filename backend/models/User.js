import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: String,
  avatar: String,
  inventory: {
    doubleur: { type: Number, default: 0 },
    assurance: { type: Number, default: 0 },
    bouclier: { type: Number, default: 0 },
    sabotage: { type: Number, default: 0 },
  },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
