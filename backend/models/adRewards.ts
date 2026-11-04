import mongoose from "mongoose";

// One rewarded ad watched to the end = one extra doubleur, in one league, for one week (modules/adRewards.ts).
// Saved only when Google confirms it (AdMob server-side verification): the app can't grant it on its own
const adRewardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  league: { type: mongoose.Schema.Types.ObjectId, ref: "leagues" },
  season: Number,
  week: Number,
  kind: { type: String, enum: ["doubleur"], default: "doubleur" },
  // AdMob's id for this view: Google can call twice for the same ad, it only counts once
  transactionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

adRewardSchema.index({ transactionId: 1 }, { unique: true });
adRewardSchema.index({ user: 1, league: 1, season: 1, week: 1 });

const AdReward = mongoose.model("adrewards", adRewardSchema);

export default AdReward;
