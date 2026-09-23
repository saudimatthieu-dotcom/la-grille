import mongoose from "mongoose";

const gridSchema = mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: "League", required: true },
  season: { type: Number, required: true },
  week: { type: Number, required: true },
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  lockAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["open", "locked", "scored"],
    default: "open",
  },
}, { timestamps: true });

gridSchema.index({ league: 1, season: 1, week: 1 }, { unique: true });

const Grid = mongoose.model("Grid", gridSchema);
export default Grid;
