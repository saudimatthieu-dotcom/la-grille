import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../config/theme";
import { formatDay, formatTime } from "../utils/format";

type Props = {
  lockAt: string;
  // A match screen: the kick-off is shown next to the countdown
  startsAt?: string;
};

// 7 → "07"
function pad(value: number) {
  return String(value).padStart(2, "0");
}

export default function Countdown({ lockAt, startsAt }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(interval);
  }, []);

  const remaining = new Date(lockAt).getTime() - now;
  const isLocked = remaining <= 0;

  const totalSeconds = Math.floor(Math.max(remaining, 0) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const countdown = days > 0 ? `${days}j ${time}` : time;
  // Shorter for the half-width tile: "1j 08h55"
  const shortCountdown = days > 0 ? `${days}j ${pad(hours)}h${pad(minutes)}` : time;

  // Match screen: two tiles side by side — when it kicks off, how long I have left
  if (startsAt) {
    return (
      <View style={styles.tiles}>
        <View style={styles.tile}>
          <View style={styles.tileHeader}>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <Text style={styles.tileLabel}>Coup d&apos;envoi</Text>
          </View>
          <Text style={styles.kickoff} numberOfLines={1} adjustsFontSizeToFit>
            {formatTime(startsAt)}
          </Text>
          <Text style={styles.tileSub}>{formatDay(startsAt)}</Text>
        </View>

        <View style={styles.tile}>
          <View style={styles.tileHeader}>
            <Ionicons
              name={isLocked ? "lock-closed" : "time-outline"}
              size={16}
              color={isLocked ? colors.danger : colors.accent}
            />
            <Text style={styles.tileLabel}>{isLocked ? "Pronostics" : "Verrouillage dans"}</Text>
          </View>
          {/* adjustsFontSizeToFit: shrinks the text instead of wrapping it on a small phone */}
          <Text style={isLocked ? styles.lockedValue : styles.countdown} numberOfLines={1} adjustsFontSizeToFit>
            {isLocked ? "Fermés" : shortCountdown}
          </Text>
        </View>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={styles.container}>
        <Ionicons name="lock-closed" size={18} color={colors.danger} />
        <Text style={styles.locked}>Grille verrouillée</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={18} color={colors.accent} />
      <Text style={styles.label}>Verrouillage dans</Text>
      <Text style={styles.time}>{countdown}</Text>
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
  tiles: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  kickoff: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  tileSub: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  countdown: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  lockedValue: {
    color: colors.danger,
    fontSize: 24,
    fontWeight: "900",
  },
});
