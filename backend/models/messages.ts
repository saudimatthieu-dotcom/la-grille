import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: "leagues" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
  type: { type: String, enum: ["chat", "system"], default: "chat" },
  text: String,
  meta: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("messages", messageSchema);

export default Message;
