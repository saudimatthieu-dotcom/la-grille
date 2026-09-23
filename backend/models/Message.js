import mongoose from "mongoose";

const messageSchema = mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: "League", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  type: { type: String, enum: ["chat", "system"], required: true },
  text: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
