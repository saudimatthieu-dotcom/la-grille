import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  grid: { type: mongoose.Schema.Types.ObjectId, ref: "grids" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "events" },
  payload: mongoose.Schema.Types.Mixed,
  // The raw points, without any bonus: the general ranking and the public league.
  // The bonuses and the sabotages are tactics, one league each — see leaguePoints.ts
  points: { type: Number, default: null },
  scoredAt: Date,
});

predictionSchema.index({ user: 1, event: 1 }, { unique: true });

const Prediction = mongoose.model("predictions", predictionSchema);

export default Prediction;
