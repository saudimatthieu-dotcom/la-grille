import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { BONUSES } from "../config/bonuses";
import { SPORT_ICONS } from "../config/sports";
import { colors } from "../config/theme";
import type { Prediction, SportEvent } from "../types";
import { eventTitle, formatDay, formatResult, formatTime } from "../utils/format";
import TacticIcon from "./TacticIcon";

type Props = {
  event: SportEvent;
  // My prediction on this match in this league, if I made one
  prediction?: Prediction;
  // When the grid was loaded: decides whether the match is still open
  now: number;
  // The league's season is over: the match shows, but can't be predicted
  seasonOver: boolean;
  onPress: () => void;
};

// One match of the week's grid: kick-off, teams, my bonus, and its status (to predict, predicted, locked, result)
export default function MatchRow({ event, prediction, now, seasonOver, onPress }: Props) {
  const isFinished = event.status === "finished";
  const isLocked = !isFinished && new Date(event.lockAt).getTime() <= now;
  // The bonus I played on this match here, if any: its icon sits next to the status
  const bonus = BONUSES.find((item) => item.kind === prediction?.bonus);

  let status = (
    <Ionicons
      name={prediction ? "checkmark-circle" : "ellipse-outline"}
      size={22}
      color={prediction ? colors.accent : colors.muted}
    />
  );

  if (isFinished) {
    status = (
      <View style={styles.resultBox}>
        <Text style={styles.resultText}>{formatResult(event)}</Text>
        <Text style={styles.points}>{prediction?.points != null ? `+${prediction.points} pts` : "—"}</Text>
      </View>
    );
  } else if (isLocked) {
    status = <Ionicons name="lock-closed" size={20} color={colors.muted} />;
  }

  return (
    <TouchableOpacity
      style={[styles.row, (isLocked || seasonOver) && styles.rowLocked]}
      disabled={isFinished || isLocked || seasonOver}
      onPress={onPress}
    >
      {/* Kick-off first, like a fixture list: "20:45" over "ven. 2 oct." */}
      <View style={styles.kickoff}>
        {/* numberOfLines + adjustsFontSizeToFit: always one line, the text shrinks a little if needed */}
        <Text style={styles.kickoffTime} numberOfLines={1} adjustsFontSizeToFit>
          {formatTime(event.startsAt)}
        </Text>
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
      {bonus && <TacticIcon kind={bonus.kind} size={56} />}
      {status}
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
  rowLocked: {
    opacity: 0.6,
  },
  kickoff: {
    width: 84,
    alignItems: "center",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  kickoffTime: {
    color: colors.text,
    fontSize: 17,
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
  rowInfoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  rowInfo: {
    color: colors.muted,
    fontSize: 13,
  },
  resultBox: {
    alignItems: "flex-end",
    maxWidth: 140,
  },
  resultText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  points: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
});
