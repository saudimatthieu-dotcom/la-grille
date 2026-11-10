import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GRID_TYPES } from "../config/gridTypes";
import { colors } from "../config/theme";
import { ordinal } from "../utils/format";
import ProgressBar from "./ProgressBar";

// One of my leagues, as GET /leagues/user sends it
export type MyLeague = {
  _id: string;
  name: string;
  gridType: string;
  members: { user: string }[];
  myPoints: number;
  myRank: number;
  filled: number;
  total: number | null;
};

type Props = {
  league: MyLeague;
  onPress: () => void;
};

// One league on the home page: my rank, my points and how much of this week's grid I have filled
export default function HomeLeagueCard({ league, onPress }: Props) {
  const gridType = GRID_TYPES.find((type) => type.value === league.gridType);
  const isComplete = league.total !== null && league.filled >= league.total;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardIcon}>
        <Ionicons name={gridType?.icon ?? "trophy-outline"} size={24} color={colors.accent} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{league.name}</Text>
          <View style={[styles.dot, { backgroundColor: isComplete ? colors.accent : colors.danger }]} />
        </View>
        <Text style={styles.cardType}>Grille {gridType?.label.toLowerCase()}</Text>
        <Text style={styles.cardInfo}>
          {league.myRank === 1 && league.myPoints > 0 ? "👑 " : ""}
          {ordinal(league.myRank)} / {league.members.length} · {league.myPoints} pts
        </Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <ProgressBar value={league.filled} max={league.total ?? 10} />
          </View>
          <Text style={styles.progressText}>
            {league.filled}/{league.total ?? 10}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderColor: colors.accent,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardType: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 1,
  },
  cardInfo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
  },
});
