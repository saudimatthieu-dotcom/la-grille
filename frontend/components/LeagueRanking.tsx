import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import Avatar from "./Avatar";
import { formatWeek } from "../utils/format";
import type { MonthlyWinners, PastSeason } from "../types";

type Props = {
  leagueId: string;
  leagueName: string;
};

// "month": the public league only (its monthly prize) — "season": its general ranking, which never resets
type Scope = "week" | "month" | "season";

const MEDALS = ["🥇", "🥈", "🥉"];

// "octobre 2026" for "2026-10"
function monthName(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

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

// The Classement tab of a league: Semaine / Saison, the past weeks, and the sabotage for the lanterne rouge
export default function LeagueRanking({ leagueId, leagueName }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useSelector((state: RootState) => state.user.value.token);
  const username = useSelector((state: RootState) => state.user.value.username);

  const [scope, setScope] = useState<Scope>("season");
  // null = this week; the arrows of the Semaine tab pick an older one
  const [selectedWeek, setSelectedWeek] = useState<WeekRef | null>(null);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  // The palmarès: past seasons' podiums (private league), or each month's winners (public league)
  const [pastSeasons, setPastSeasons] = useState<PastSeason[]>([]);
  const [monthlyWinners, setMonthlyWinners] = useState<MonthlyWinners[]>([]);
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
          setPastSeasons(data.pastSeasons ?? []);
          setMonthlyWinners(data.monthlyWinners ?? []);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [leagueId, token, scope, selectedWeek]);

  // The sabotage belongs to the lanterne rouge of the season ranking — never in the public league
  const amLastPlace =
    !isPublic && scope === "season" && ranking.some((row) => row.username === username && row.isLastPlace);

  // The public league: Semaine / Mois (the monthly prize) / Général — a private league: Semaine / Saison
  const scopes: { value: Scope; label: string }[] = isPublic
    ? [
        { value: "week", label: "Semaine" },
        { value: "month", label: "Mois" },
        { value: "season", label: "Général" },
      ]
    : [
        { value: "week", label: "Semaine" },
        { value: "season", label: "Saison" },
      ];

  const toggleButtons = scopes.map((item) => (
    <TouchableOpacity
      key={item.value}
      style={[styles.toggleButton, scope === item.value && styles.toggleSelected]}
      onPress={() => setScope(item.value)}
    >
      <Text style={[styles.toggleText, scope === item.value && styles.toggleTextSelected]}>{item.label}</Text>
    </TouchableOpacity>
  ));

  // Newest first
  const seasonRows = [...pastSeasons].reverse().map((past) => (
    <View key={past.number} style={styles.palmaresRow}>
      <Text style={styles.palmaresTitle}>Saison {past.number}</Text>
      <Text style={styles.palmaresText}>
        {past.podium.length > 0
          ? past.podium.map((row) => `${MEDALS[row.rank - 1] ?? ""} ${row.username} ${row.points} pts`).join("   ")
          : "Personne n'a marqué de points"}
      </Text>
    </View>
  ));

  const monthRows = [...monthlyWinners].reverse().map((entry) => (
    <View key={entry.month} style={styles.palmaresRow}>
      <Text style={styles.palmaresTitle}>{monthName(entry.month)}</Text>
      <Text style={styles.palmaresText}>
        {entry.winners.length > 0
          ? entry.winners.map((winner) => `👑 ${winner.username} ${winner.points} pts`).join("   ")
          : "Pas de gagnant"}
      </Text>
    </View>
  ));

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
          {scope !== "week" && row.weekPoints > 0 && <Text style={styles.delta}>+{row.weekPoints}</Text>}
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
    <View>
      <View style={styles.toggle}>{toggleButtons}</View>

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

      {/* The month's #1 wins a month of VIP: said above the month ranking */}
      {scope === "month" && (
        <Text style={styles.prizeHint}>
          👑 Le n°1 du mois gagne 1 mois de Pass VIP (en cas d&apos;égalité, tous les premiers).
        </Text>
      )}

      {rows}

      {/* Palmarès: under the season ranking (private), under the month ranking (public) */}
      {!isPublic && scope === "season" && seasonRows.length > 0 && (
        <>
          <Text style={styles.palmares}>Palmarès</Text>
          {seasonRows}
        </>
      )}
      {isPublic && scope === "month" && monthRows.length > 0 && (
        <>
          <Text style={styles.palmares}>Gagnants des mois passés</Text>
          {monthRows}
        </>
      )}

      {/* My grid of the week shown above: my predictions, the real results and my points */}
      {scope === "week" && weekInfo?.gridId && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => weekInfo.gridId && navigation.navigate("Result", { gridId: weekInfo.gridId, leagueId, leagueName })}
        >
          <Text style={styles.buttonText}>VOIR MA GRILLE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  prizeHint: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  palmares: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  palmaresRow: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  palmaresTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  palmaresText: {
    color: colors.muted,
    fontSize: 14,
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
