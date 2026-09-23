import mongoose from "mongoose";

const tacticSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: "leagues" },
  week: Number,
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  target: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  kind: { type: String, enum: ["doubleur", "assurance", "bouclier", "sabotage"] },
  prediction: { type: mongoose.Schema.Types.ObjectId, ref: "predictions" },
  resolved: { type: Boolean, default: false },
});

const Tactic = mongoose.model("tactics", tacticSchema);

export default Tactic;
