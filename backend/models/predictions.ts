import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  grid: { type: mongoose.Schema.Types.ObjectId, ref: "grids" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "events" },
  payload: mongoose.Schema.Types.Mixed,
  bonus: {
    doubleur: { type: Boolean, default: false },
    assurance: { type: Boolean, default: false },
    bouclier: { type: Boolean, default: false },
  },
  // The real points (doubleur and assurance included) — a sabotage only counts in its league, see tactics
  points: { type: Number, default: null },
  scoredAt: Date,
});

predictionSchema.index({ user: 1, event: 1 }, { unique: true });

const Prediction = mongoose.model("predictions", predictionSchema);

export default Prediction;
