import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../config/theme";

type Props = {
  lockAt: string;
};

// 7 → "07"
function pad(value: number) {
  return String(value).padStart(2, "0");
}

export default function Countdown({ lockAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  const remaining = new Date(lockAt).getTime() - now;

  if (remaining <= 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed" size={18} color={colors.danger} />
        <Text style={styles.locked}>Grille verrouillée</Text>
      </View>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={18} color={colors.accent} />
      <Text style={styles.label}>Verrouillage dans</Text>
      <Text style={styles.time}>{days > 0 ? `${days}j ${time}` : time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
  },
  time: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  locked: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
});
