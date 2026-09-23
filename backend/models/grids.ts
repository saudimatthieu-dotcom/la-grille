import mongoose from "mongoose";

const gridSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: "leagues" },
  season: Number,
  week: Number,
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: "events" }],
  lockAt: Date,
  status: { type: String, enum: ["open", "locked", "scored"], default: "open" },
});

gridSchema.index({ league: 1, season: 1, week: 1 }, { unique: true });

const Grid = mongoose.model("grids", gridSchema);

export default Grid;
