import mongoose from "mongoose";

// Why a player reports a chat message (DSA: a way to flag abusive content)
export const REPORT_REASONS = ["harcelement", "haine", "spam", "autre"] as const;

const reportSchema = new mongoose.Schema({
  message: { type: mongoose.Schema.Types.ObjectId, ref: "messages", required: true },
  league: { type: mongoose.Schema.Types.ObjectId, ref: "leagues", required: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  reason: { type: String, enum: REPORT_REASONS, required: true },
  // open: waiting for an admin — handled: an admin hid the message or dismissed the report
  status: { type: String, enum: ["open", "handled"], default: "open" },
  createdAt: { type: Date, default: Date.now },
});

// One report per player and message: pressing twice changes nothing
reportSchema.index({ message: 1, reporter: 1 }, { unique: true });

const Report = mongoose.model("reports", reportSchema);

export default Report;
