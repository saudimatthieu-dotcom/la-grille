import mongoose from "mongoose";

const eventSchema = mongoose.Schema({
  sport: {
    type: String,
    enum: ["football", "basket", "rugby", "handball", "f1", "cyclisme", "tennis"],
    required: true,
  },
  provider: String,
  externalId: String,
  competition: String,
  homeTeam: { name: String, logo: String },
  awayTeam: { name: String, logo: String },
  participants: [{ name: String, photo: String }],
  startsAt: { type: Date, required: true },
  lockAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["scheduled", "live", "finished", "cancelled"],
    default: "scheduled",
  },
  ouLine: Number,
  result: mongoose.Schema.Types.Mixed,
  popularity: { type: Number, default: 0 },
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);
export default Event;
