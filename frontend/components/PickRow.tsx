import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SPORT_ICONS } from "../config/sports";
import { colors } from "../config/theme";
import type { PickEvent } from "../types";
import { eventTitle, formatDay, formatTime } from "../utils/format";

type Props = {
  event: PickEvent;
  isPicked: boolean;
  onToggle: () => void;
};

// One match of the "Choisir les matchs" page: kick-off, teams, competition and its checkbox
export default function PickRow({ event, isPicked, onToggle }: Props) {
  // A match that has started can't be added any more (it can still be taken out if nobody predicted it)
  const isDisabled = event.isLocked && !isPicked;

  return (
    <TouchableOpacity style={[styles.row, isDisabled && styles.rowDisabled]} onPress={onToggle} disabled={isDisabled}>
      <View style={styles.kickoff}>
        <Text style={styles.kickoffTime}>{formatTime(event.startsAt)}</Text>
        <Text style={styles.kickoffDay} numberOfLines={1} adjustsFontSizeToFit>
          {formatDay(event.startsAt)}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{eventTitle(event)}</Text>
        <View style={styles.rowInfoLine}>
          <Ionicons name={SPORT_ICONS[event.sport]} size={14} color={colors.accent} />
          <Text style={styles.rowInfo}>{event.competition}</Text>
        </View>
      </View>
      <Ionicons name={isPicked ? "checkbox" : "square-outline"} size={24} color={isPicked ? colors.accent : colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  kickoff: {
    width: 72,
    alignItems: "center",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  kickoffTime: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  kickoffDay: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  rowInfoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  rowInfo: {
    color: colors.muted,
    fontSize: 13,
  },
});
