import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "../config/theme";
import Avatar from "./Avatar";
import TacticIcon from "./TacticIcon";

// One player of a ranking, as the ranking route sends it
export type RankingRowData = {
  userId: string;
  username: string;
  avatar?: string | null;
  points: number;
  weekPoints: number;
  rank: number;
  isLeader: boolean;
  isLastPlace: boolean;
};

type Props = {
  row: RankingRowData;
  isMe: boolean;
  // "+3" next to the total: the points of this week
  showWeekPoints: boolean;
  // Set when I'm the lanterne rouge and this is a rival: the bomb button
  onSabotage?: () => void;
};

// One line of the Classement tab: rank, avatar, name, points — and the sabotage bomb for the lanterne rouge
export default function RankingRow({ row, isMe, showWeekPoints, onSabotage }: Props) {
  return (
    <View style={[styles.row, isMe && styles.rowMe, row.isLastPlace && styles.rowLast]}>
      <Text style={styles.rank}>{row.rank}</Text>
      <Avatar avatar={row.avatar} username={row.username} />

      <View style={styles.rowBody}>
        <View style={styles.nameLine}>
          {row.isLeader && <MaterialCommunityIcons name="crown" size={20} color={colors.gold} />}
          <Text style={styles.username}>
            {row.username}
            {isMe ? " (moi)" : ""}
          </Text>
        </View>
        {row.isLastPlace && <Text style={styles.lastBadge}>LANTERNE ROUGE</Text>}
      </View>

      <View style={styles.pointsBox}>
        <Text style={styles.points}>{row.points} pts</Text>
        {showWeekPoints && row.weekPoints > 0 && <Text style={styles.delta}>+{row.weekPoints}</Text>}
      </View>

      {onSabotage && (
        <TouchableOpacity style={styles.sabotageButton} onPress={onSabotage}>
          <TacticIcon kind="sabotage" size={52} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowMe: {
    borderColor: colors.accent,
  },
  rowLast: {
    borderColor: colors.danger,
  },
  rank: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    width: 28,
    textAlign: "center",
  },
  rowBody: {
    flex: 1,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  lastBadge: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
  },
  pointsBox: {
    alignItems: "flex-end",
  },
  points: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900",
  },
  delta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  sabotageButton: {
    borderColor: colors.danger,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 4,
  },
});
