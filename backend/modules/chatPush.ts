import type mongoose from "mongoose";

import { sendPush } from "./sendPush";
import type { PushText } from "./sendPush";

// A long message is cut in the notification (the whole text is in the chat)
const MAX_BODY_LENGTH = 120;

type Member = { user?: mongoose.Types.ObjectId | null; chatNotifications?: boolean | null };

// Who gets the push: every member but the sender, unless they switched this league's bell off
export function chatRecipients(members: Member[], senderId: mongoose.Types.ObjectId): mongoose.Types.ObjectId[] {
  return members
    .filter((member) => member.user && !member.user.equals(senderId) && member.chatNotifications !== false)
    .map((member) => member.user as mongoose.Types.ObjectId);
}

// "COPAINS" / "Paul : t'es mort ce week-end"
export function chatPushText(leagueName: string, username: string, text: string): PushText {
  const body = `${username} : ${text}`;

  return {
    title: leagueName,
    body: body.length > MAX_BODY_LENGTH ? `${body.slice(0, MAX_BODY_LENGTH - 1)}…` : body,
  };
}

// Sends the new chat message to the league's other members (called after the message is saved)
export function notifyChat(
  league: { _id: mongoose.Types.ObjectId; name: string; members: Member[] },
  sender: { _id: mongoose.Types.ObjectId; username: string },
  text: string
) {
  const recipients = chatRecipients(league.members, sender._id);

  if (recipients.length === 0) {
    return Promise.resolve({ sent: 0, removed: 0 });
  }

  return sendPush({ _id: { $in: recipients } }, "message", chatPushText(league.name, sender.username, text), {
    leagueId: String(league._id),
    leagueName: league.name,
  });
}
