import mongoose from "mongoose";

const tacticSchema = mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: "League", required: true },
  week: { type: Number, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  kind: {
    type: String,
    enum: ["doubleur", "assurance", "bouclier", "sabotage"],
    required: true,
  },
  prediction: { type: mongoose.Schema.Types.ObjectId, ref: "Prediction" },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

const Tactic = mongoose.model("Tactic", tacticSchema);
export default Tactic;
