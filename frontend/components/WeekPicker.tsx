import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../config/theme";
import { formatWeek } from "../utils/format";

const WEEK_LABELS = ["Cette semaine", "Semaine prochaine", "Dans 2 semaines", "Dans 3 semaines"];

type Props = {
  // 0 = this week, 1 = next week… up to maxOffset
  offset: number;
  maxOffset: number;
  // The week shown (0 until the server has answered)
  season: number;
  week: number;
  onChange: (offset: number) => void;
};

// ◀ Cette semaine ▶ on the "Choisir les matchs" page: which week's matches are being picked
export default function WeekPicker({ offset, maxOffset, season, week, onChange }: Props) {
  return (
    <View style={styles.weekNav}>
      <TouchableOpacity onPress={() => onChange(offset - 1)} disabled={offset === 0}>
        <Ionicons name="chevron-back-circle" size={30} color={offset === 0 ? colors.border : colors.accent} />
      </TouchableOpacity>
      <View style={styles.weekLabel}>
        <Text style={styles.weekTitle}>{WEEK_LABELS[offset]}</Text>
        {week > 0 && (
          <Text style={styles.weekDates}>
            Semaine {week} · {formatWeek(season, week)}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={() => onChange(offset + 1)} disabled={offset >= maxOffset}>
        <Ionicons name="chevron-forward-circle" size={30} color={offset >= maxOffset ? colors.border : colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  weekLabel: {
    alignItems: "center",
  },
  weekTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  weekDates: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
