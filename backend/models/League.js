import mongoose from "mongoose";

const leagueSchema = mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  gridType: { type: String, enum: ["officielle", "classique", "exotique", "surmesure"] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    points: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now }
  }],
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

const League = mongoose.model("League", leagueSchema);
export default League;
