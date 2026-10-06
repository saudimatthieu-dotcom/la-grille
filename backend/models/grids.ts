import mongoose from "mongoose";

// One grid per week: every match of the week. Each league plays the part that fits its type (see gridTypes.ts)
const gridSchema = new mongoose.Schema({
  season: Number,
  week: Number,
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: "events" }],
  lockAt: Date,
  status: { type: String, enum: ["open", "locked", "scored"], default: "open" },
});

gridSchema.index({ season: 1, week: 1 }, { unique: true });

const Grid = mongoose.model("grids", gridSchema);

export default Grid;
