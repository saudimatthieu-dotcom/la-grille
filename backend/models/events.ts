import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: String,
  logo: String,
});

const participantSchema = new mongoose.Schema({
  name: String,
  photo: String,
});

const eventSchema = new mongoose.Schema({
  sport: {
    type: String,
    enum: ["football", "basket", "rugby", "handball", "f1", "cyclisme", "tennis"],
    required: true,
  },
  provider: String,
  externalId: String,
  competition: String,
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  participants: [participantSchema],
  startsAt: Date,
  lockAt: Date,
  status: {
    type: String,
    enum: ["scheduled", "live", "finished", "cancelled"],
    default: "scheduled",
  },
  ouLine: Number,
  result: mongoose.Schema.Types.Mixed,
  popularity: Number,
});

eventSchema.index({ provider: 1, externalId: 1 }, { unique: true });

const Event = mongoose.model("events", eventSchema);

export default Event;
