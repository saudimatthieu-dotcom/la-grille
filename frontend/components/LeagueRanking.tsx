import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import Palmares from "./Palmares";
import RankingRow, { type RankingRowData } from "./RankingRow";
import { formatWeek } from "../utils/format";
import type { MonthlyWinners, PastSeason } from "../types";
import { loadRanking } from "../data/leagues";

type Props = {
  leagueId: string;
  leagueName: string;
};

// "month": the public league only (its monthly prize) — "season": its general ranking, which never resets
type Scope = "week" | "month" | "season";

type WeekRef = { season: number; week: number };

// The week shown in the Semaine tab, sent back by the ranking route
type WeekInfo = WeekRef & {
  isThisWeek: boolean;
  gridId: string | null;
  previous: WeekRef | null;
  next: WeekRef | null;
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
  const [ranking, setRanking] = useState<RankingRowData[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  // The palmarès: past seasons' podiums (private league), or each month's winners (public league)
  const [pastSeasons, setPastSeasons] = useState<PastSeason[]>([]);
  const [monthlyWinners, setMonthlyWinners] = useState<MonthlyWinners[]>([]);
  const [error, setError] = useState("");

  // Runs again every time the Semaine / Saison toggle or the week changes
  useEffect(() => {
    loadRanking(leagueId, token, scope, scope === "week" ? selectedWeek : null)
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
      .catch(() => setError("Impossible de contacter le serveur"));
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

  const rows = ranking.map((row) => (
    <RankingRow
      key={row.userId}
      row={row}
      isMe={row.username === username}
      // In the Semaine tab the points are already the week's
      showWeekPoints={scope !== "week"}
      onSabotage={
        amLastPlace && row.username !== username
          ? () => navigation.navigate("Sabotage", { leagueId, targetUserId: row.userId, targetUsername: row.username })
          : undefined
      }
    />
  ));

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
      {!isPublic && scope === "season" && <Palmares pastSeasons={pastSeasons} />}
      {isPublic && scope === "month" && <Palmares monthlyWinners={monthlyWinners} />}

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
  sabotageHint: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
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
