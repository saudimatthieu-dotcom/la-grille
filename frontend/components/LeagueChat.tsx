import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import type { ChatMessage } from "../types";
import ChatBubble from "./ChatBubble";
import { loadLeagueMessages, saveChatNotifications, sendMessage } from "../data/messages";

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
  // The bell: a push for each message of this league (null until the server answers)
  const [chatNotifications, setChatNotifications] = useState<boolean | null>(null);

  // Since React Native 0.88 ScrollView is a function component: the ref holds a ScrollViewInstance (scrollToEnd…)
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Loads the chat now, then every 10 seconds while the tab is open (leaving the tab stops it)
  useEffect(() => {
    const loadMessages = () => {
      loadLeagueMessages(leagueId, token)
        .then((data) => {
          if (data.result) {
            setMessages(data.messages);
            setChatNotifications(data.chatNotifications);
          } else {
            setError(data.error);
          }
        })
        .catch(() => setError("Impossible de contacter le serveur"));
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

    sendMessage(leagueId, { token, text })
      .then((data) => {
        if (data.result) {
          setMessages([...messages, data.message]);
          setText("");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  // Switches this league's chat push on/off — shown at once, put back if the server refuses
  const toggleNotifications = () => {
    if (chatNotifications === null) {
      return;
    }

    const previous = chatNotifications;
    setChatNotifications(!previous);
    setError("");

    saveChatNotifications(leagueId, { token, enabled: !previous })
      .then((data) => {
        if (!data.result) {
          setChatNotifications(previous);
          setError(data.error);
        }
      })
      .catch(() => {
        setChatNotifications(previous);
        setError("Impossible de contacter le serveur");
      });
  };

  const bubbles = messages.map((message) => (
    <ChatBubble key={message._id} message={message} isMe={message.user?.username === username} />
  ));

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>LE COIN CHAMBRAGE</Text>
        {chatNotifications !== null && (
          <TouchableOpacity onPress={toggleNotifications} hitSlop={10}>
            <Ionicons
              name={chatNotifications ? "notifications" : "notifications-off-outline"}
              size={22}
              color={chatNotifications ? colors.accent : colors.muted}
            />
          </TouchableOpacity>
        )}
      </View>

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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
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
