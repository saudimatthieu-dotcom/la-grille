import mongoose from "mongoose";

// The matches picked by hand for one week: by an admin for a grid type (officielle, classique, exotique),
// or by the VIP owner of a sur-mesure league for their league. No selection = the automatic one (gridTypes.ts)
const selectionSchema = new mongoose.Schema({
  season: Number,
  week: Number,
  // One of the two is set: the grid type (admins) or the league (sur-mesure)
  gridType: { type: String, enum: ["officielle", "classique", "exotique", null], default: null },
  league: { type: mongoose.Schema.Types.ObjectId, ref: "leagues", default: null },
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: "events" }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  updatedAt: { type: Date, default: Date.now },
});

selectionSchema.index({ season: 1, week: 1, gridType: 1, league: 1 }, { unique: true });

const Selection = mongoose.model("selections", selectionSchema);

export default Selection;
