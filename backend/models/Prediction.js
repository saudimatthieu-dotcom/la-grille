import mongoose from "mongoose";

const predictionSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  grid: { type: mongoose.Schema.Types.ObjectId, ref: "Grid", required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  payload: mongoose.Schema.Types.Mixed,
  bonus: {
    doubleur: { type: Boolean, default: false },
    assurance: { type: Boolean, default: false },
    bouclier: { type: Boolean, default: false },
  },
  sabotagedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  shieldTriggered: { type: Boolean, default: false },
  points: { type: Number, default: null },
  scoredAt: Date,
}, { timestamps: true });

predictionSchema.index({ user: 1, event: 1 }, { unique: true });

const Prediction = mongoose.model("Prediction", predictionSchema);
export default Prediction;
