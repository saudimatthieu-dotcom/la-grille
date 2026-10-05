import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import type { ChatMessage } from "../types";
import Avatar from "./Avatar";

type Props = {
  leagueId: string;
};

// The Chat tab of a league: messages + system logs, the input stays at the bottom
export default function LeagueChat({ leagueId }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);
  const username = useSelector((state: RootState) => state.user.value.username);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  // Loads the chat now, then every 10 seconds while the tab is open (leaving the tab stops it)
  useEffect(() => {
    const loadMessages = () => {
      fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/messages/league/${leagueId}/${token}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.result) {
            setMessages(data.messages);
          } else {
            setError(data.error);
          }
        })
        .catch(() => setError("Impossible to connect to server"));
    };

    loadMessages();
    const interval = setInterval(loadMessages, 10000);

    return () => clearInterval(interval);
  }, [leagueId, token]);

  const handleSend = () => {
    if (text.trim() === "") {
      return;
    }

    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/messages/league/${leagueId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, text }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setMessages([...messages, data.message]);
          setText("");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const bubbles = messages.map((message) => {
    // System logs (sabotage, bouclier) are centred, like an announcement
    if (message.type === "system") {
      return (
        <Text key={message._id} style={styles.system}>
          {message.text}
        </Text>
      );
    }

    const isMe = message.user?.username === username;
    const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    return (
      <View key={message._id} style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && <Avatar avatar={message.user?.avatar} username={message.user?.username} size={30} />}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && <Text style={styles.author}>{message.user?.username}</Text>}
          <Text style={[styles.text, isMe && styles.textMe]}>{message.text}</Text>
          <Text style={[styles.time, isMe && styles.timeMe]}>{time}</Text>
        </View>
      </View>
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LE COIN CHAMBRAGE</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && <Text style={styles.empty}>Aucun message. Lance le chambrage !</Text>}
        {bubbles}
      </ScrollView>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ton message…"
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          maxLength={500}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color={colors.bg} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
  system: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 6,
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
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    paddingBottom: 28,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.card,
    borderRadius: 14,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
