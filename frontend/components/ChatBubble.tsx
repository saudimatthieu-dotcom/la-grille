import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import { splitTacticText } from "../config/bonuses";
import type { ChatMessage } from "../types";
import Avatar from "./Avatar";
import TacticIcon from "./TacticIcon";
import { reportMessage } from "../data/messages";

// The reasons a player can give (same keys as backend models/reports.ts)
const REPORT_REASONS = [
  { value: "harcelement", label: "Harcèlement" },
  { value: "haine", label: "Haine ou discrimination" },
  { value: "spam", label: "Spam" },
  { value: "autre", label: "Autre" },
];

type Props = {
  message: ChatMessage;
  isMe: boolean;
};

// One line of the chat: a system log (centred), or a bubble — with a flag to report what the others write
export default function ChatBubble({ message, isMe }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  // Choosing a reason is open, then the report is sent, then the flag says thanks
  const [isChoosing, setIsChoosing] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [error, setError] = useState("");

  // System logs (sabotage, bouclier) are centred, like an announcement
  if (message.type === "system") {
    // A bonus or a sabotage: its neon icon in place of the emoji the text starts with
    const { kind, text: systemText } = splitTacticText(message.text);

    return (
      <View style={styles.systemRow}>
        {kind && <TacticIcon kind={kind} size={32} />}
        <Text style={styles.system}>{systemText}</Text>
      </View>
    );
  }

  const handleReport = (reason: string) => {
    setError("");

    reportMessage(message._id, { token, reason })
      .then((data) => {
        if (data.result) {
          setIsChoosing(false);
          setIsReported(true);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const reasonButtons = REPORT_REASONS.map((reason) => (
    <TouchableOpacity key={reason.value} style={styles.reason} onPress={() => handleReport(reason.value)}>
      <Text style={styles.reasonText}>{reason.label}</Text>
    </TouchableOpacity>
  ));

  return (
    <View>
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && <Avatar avatar={message.user?.avatar} username={message.user?.username} size={30} />}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && <Text style={styles.author}>{message.user?.username}</Text>}
          <Text style={[styles.text, isMe && styles.textMe]}>{message.text}</Text>
          <Text style={[styles.time, isMe && styles.timeMe]}>{time}</Text>
        </View>
        {/* Nobody reports their own message */}
        {!isMe && (
          <TouchableOpacity
            onPress={() => setIsChoosing(!isChoosing)}
            disabled={isReported}
            hitSlop={10}
            accessibilityLabel="Signaler ce message"
          >
            <Ionicons
              name={isReported ? "flag" : "flag-outline"}
              size={16}
              color={isReported ? colors.danger : colors.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {isChoosing && (
        <View style={styles.reasons}>
          <Text style={styles.reasonsTitle}>Pourquoi signaler ce message ?</Text>
          <View style={styles.reasonsRow}>{reasonButtons}</View>
          {error !== "" && <Text style={styles.error}>{error}</Text>}
        </View>
      )}

      {isReported && <Text style={styles.thanks}>Merci, le message a été signalé.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginVertical: 6,
  },
  system: {
    flexShrink: 1,
    color: colors.gold,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
  },
  author: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  text: {
    color: colors.text,
    fontSize: 15,
  },
  textMe: {
    color: colors.bg,
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    alignSelf: "flex-end",
  },
  timeMe: {
    color: colors.bg,
  },
  reasons: {
    marginTop: 6,
    marginLeft: 38,
    padding: 10,
    borderRadius: 12,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.card,
    gap: 8,
  },
  reasonsTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  reasonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reason: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reasonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  thanks: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 38,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
  },
});
