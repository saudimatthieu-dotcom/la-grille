import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  points: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
});

// One finished season of a private league: its dates and its podium (ties share a rank)
const pastSeasonSchema = new mongoose.Schema({
  number: Number,
  startsAt: Date,
  endsAt: Date,
  weeks: Number,
  podium: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "users" }, username: String, points: Number, rank: Number }],
});

// The public league's #1 of one calendar month ("2026-10") — each won a month of VIP (ties: all of them)
const monthlyWinnerSchema = new mongoose.Schema({
  month: String,
  winners: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "users" }, username: String, points: Number }],
});

const leagueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true, required: true },
  gridType: { type: String, enum: ["officielle", "classique", "exotique", "surmesure"] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  members: [memberSchema],
  isPublic: { type: Boolean, default: false },
  // Private leagues play seasons: seasonWeeks weeks from seasonStartsAt (a Monday), then the ranking goes back to 0
  // (see modules/seasons.ts) — 10 weeks, a VIP creator chooses 4 to 30. The public league never resets
  seasonNumber: { type: Number, default: 1 },
  seasonWeeks: { type: Number, default: 10 },
  seasonStartsAt: { type: Date, default: null },
  // "finished": podium saved, points at 0, predictions paused until the creator starts the next season
  seasonStatus: { type: String, enum: ["running", "finished"], default: "running" },
  pastSeasons: [pastSeasonSchema],
  monthlyWinners: [monthlyWinnerSchema],
  createdAt: { type: Date, default: Date.now },
});

// Only one public league: the database refuses a second league with isPublic: true
leagueSchema.index({ isPublic: 1 }, { unique: true, partialFilterExpression: { isPublic: true } });
const League = mongoose.model("leagues", leagueSchema);

export default League;
