import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import Avatar from "../components/Avatar";
import LeagueHeader from "../components/LeagueHeader";
import { formatWeek } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "Ranking">;

type Scope = "week" | "season";

type WeekRef = { season: number; week: number };

// The week shown in the Semaine tab, sent back by the ranking route
type WeekInfo = WeekRef & {
  isThisWeek: boolean;
  gridId: string | null;
  previous: WeekRef | null;
  next: WeekRef | null;
};

type RankingRow = {
  userId: string;
  username: string;
  avatar?: string | null;
  points: number;
  weekPoints: number;
  rank: number;
  isLeader: boolean;
  isLastPlace: boolean;
};

export default function RankingScreen({ navigation, route }: Props) {
  const { leagueId, leagueName } = route.params;
  const token = useSelector((state: RootState) => state.user.value.token);
  const username = useSelector((state: RootState) => state.user.value.username);

  const [scope, setScope] = useState<Scope>("season");
  // null = this week; the arrows of the Semaine tab pick an older one
  const [selectedWeek, setSelectedWeek] = useState<WeekRef | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");

  // Runs again every time the Semaine / Saison toggle or the week changes
  useEffect(() => {
    const weekQuery = scope === "week" && selectedWeek ? `&season=${selectedWeek.season}&week=${selectedWeek.week}` : "";

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/${leagueId}/ranking/${token}?scope=${scope}${weekQuery}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setRanking(data.ranking);
          setWeekInfo(data);
          setIsPublic(data.isPublic);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [leagueId, token, scope, selectedWeek]);

  // The sabotage belongs to the lanterne rouge of the season ranking — never in the public league
  const amLastPlace =
    !isPublic && scope === "season" && ranking.some((row) => row.username === username && row.isLastPlace);

  const rows = ranking.map((row) => {
    const isMe = row.username === username;

    return (
      <View key={row.userId} style={[styles.row, isMe && styles.rowMe, row.isLastPlace && styles.rowLast]}>
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
          {scope === "season" && row.weekPoints > 0 && <Text style={styles.delta}>+{row.weekPoints}</Text>}
        </View>

        {amLastPlace && !isMe && (
          <TouchableOpacity
            style={styles.sabotageButton}
            onPress={() =>
              navigation.navigate("Sabotage", { leagueId, targetUserId: row.userId, targetUsername: row.username })
            }
          >
            <MaterialCommunityIcons name="bomb" size={22} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LeagueHeader leagueId={leagueId} leagueName={leagueName} active="Ranking" />

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleButton, scope === "week" && styles.toggleSelected]}
          onPress={() => setScope("week")}
        >
          <Text style={[styles.toggleText, scope === "week" && styles.toggleTextSelected]}>Semaine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, scope === "season" && styles.toggleSelected]}
          onPress={() => setScope("season")}
        >
          <Text style={[styles.toggleText, scope === "season" && styles.toggleTextSelected]}>Saison</Text>
        </TouchableOpacity>
      </View>

      {/* ◀ 28 sept. – 4 oct. ▶ : go back to the past weeks */}
      {scope === "week" && weekInfo && (
        <View style={styles.weekPicker}>
          <TouchableOpacity
            disabled={!weekInfo.previous}
            onPress={() => setSelectedWeek(weekInfo.previous)}
            style={!weekInfo.previous && styles.arrowDisabled}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>
            {weekInfo.isThisWeek ? "Cette semaine" : formatWeek(weekInfo.season, weekInfo.week)}
          </Text>
          <TouchableOpacity
            disabled={!weekInfo.next}
            onPress={() => setSelectedWeek(weekInfo.next)}
            style={!weekInfo.next && styles.arrowDisabled}
          >
            <Ionicons name="chevron-forward" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {amLastPlace && (
        <Text style={styles.sabotageHint}>
          Tu es la lanterne rouge : touche la bombe d&apos;un rival pour saboter un de ses pronos (1 fois par semaine).
        </Text>
      )}

      {rows}

      {/* My grid of the week shown above: my predictions, the real results and my points */}
      {scope === "week" && weekInfo?.gridId && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => weekInfo.gridId && navigation.navigate("Result", { gridId: weekInfo.gridId, leagueId, leagueName })}
        >
          <Text style={styles.buttonText}>VOIR MA GRILLE</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    paddingTop: 64,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleSelected: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  toggleTextSelected: {
    color: colors.bg,
  },
  weekPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  weekLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  arrowDisabled: {
    opacity: 0.25,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 12,
  },
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
  sabotageHint: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
  },
  sabotageButton: {
    borderColor: colors.danger,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 6,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
  },
});
