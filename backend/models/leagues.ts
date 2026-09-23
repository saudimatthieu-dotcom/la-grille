import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  points: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
});

const leagueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true, required: true },
  gridType: { type: String, enum: ["officielle", "classique", "exotique", "surmesure"] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  members: [memberSchema],
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const League = mongoose.model("leagues", leagueSchema);

export default League;
