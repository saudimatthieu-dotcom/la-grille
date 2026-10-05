import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  grid: { type: mongoose.Schema.Types.ObjectId, ref: "grids" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "events" },
  // One prediction per league: the same match can be predicted differently in each of my leagues.
  // The public league's predictions (made from the Grille tab) are the general ranking
  league: { type: mongoose.Schema.Types.ObjectId, ref: "leagues" },
  payload: mongoose.Schema.Types.Mixed,
  // The raw points, without any bonus — the league's bonuses and sabotages are tactics, see leaguePoints.ts
  points: { type: Number, default: null },
  scoredAt: Date,
});

predictionSchema.index({ user: 1, event: 1, league: 1 }, { unique: true });

const Prediction = mongoose.model("predictions", predictionSchema);

export default Prediction;
