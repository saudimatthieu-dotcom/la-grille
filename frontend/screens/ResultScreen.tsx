import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { SPORT_ICONS } from "../config/sports";
import type { Bonus, PredictionPayload, SportEvent } from "../types";
import { eventTitle, formatDate, formatPayload, formatResult, formatWeek, ordinal } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

type ResultItem = {
  event: SportEvent;
  payload: PredictionPayload | null;
  bonus: Bonus | null;
  points: number | null;
  sabotaged: boolean;
  shieldTriggered: boolean;
};

type Results = {
  season: number;
  week: number;
  isThisWeek: boolean;
  results: ResultItem[];
  weekPoints: number;
  // null on the general grid: there's only a rank inside a league
  rankBefore: number | null;
  rankNow: number | null;
  passed: string[];
};

// Short tags explaining the points: "⚡ Doubleur", "💣 Saboté"…
function tagsOf(item: ResultItem) {
  const tags: string[] = [];

  if (item.sabotaged) {
    tags.push(item.shieldTriggered ? "🛡️ Sabotage bloqué" : "💣 Saboté");
  }
  if (item.bonus?.doubleur) {
    tags.push("⚡ Doubleur");
  }
  if (item.bonus?.assurance) {
    tags.push("☂️ Assurance");
  }
  return tags;
}

export default function ResultScreen({ navigation, route }: Props) {
  const { gridId, leagueId, leagueName } = route.params;
  const token = useSelector((state: RootState) => state.user.value.token);

  const [data, setData] = useState<Results | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // With a league, the points count its sabotages and I get my rank in it
    const query = leagueId ? `?leagueId=${leagueId}` : "";

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/predictions/results/${gridId}/${token}${query}`)
      .then((response) => response.json())
      .then((json) => {
        if (json.result) {
          setData(json);
        } else {
          setError(json.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [gridId, leagueId, token]);

  const rows = (data?.results ?? []).map((item) => {
    const tags = tagsOf(item);

    return (
      <View key={item.event._id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={SPORT_ICONS[item.event.sport]} size={20} color={colors.accent} />
          <Text style={styles.cardTitle}>{eventTitle(item.event)}</Text>
          <Text style={styles.score}>{formatResult(item.event)}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDate(item.event.startsAt)}</Text>

        <Text style={styles.label}>TON PRONO</Text>
        <Text style={styles.prono}>{item.payload ? formatPayload(item.event, item.payload) : "Pas de prono"}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.tags}>{tags.join("  ·  ")}</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{item.points != null ? `+${item.points} pts` : "—"}</Text>
          </View>
        </View>
      </View>
    );
  });

  const rankDelta = data && data.rankBefore !== null && data.rankNow !== null ? data.rankBefore - data.rankNow : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>RÉSULTATS</Text>
          <Text style={styles.subtitle}>{leagueName ?? "Grille générale"}</Text>
        </View>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {data && (
        <View style={styles.summary}>
          <Text style={styles.label}>
            {data.isThisWeek ? "CETTE SEMAINE" : formatWeek(data.season, data.week).toUpperCase()}
          </Text>
          <Text style={styles.weekPoints}>+{data.weekPoints} pts</Text>

          {data.rankBefore !== null && data.rankNow !== null && (
            <>
              <Text style={[styles.label, styles.rankLabel]}>CLASSEMENT</Text>
              <View style={styles.rankRow}>
                <Text style={styles.rank}>
                  {ordinal(data.rankBefore)} → {ordinal(data.rankNow)}
                </Text>
                {rankDelta !== 0 && (
                  <View style={styles.rankDelta}>
                    <Ionicons
                      name={rankDelta > 0 ? "arrow-up" : "arrow-down"}
                      size={18}
                      color={rankDelta > 0 ? colors.accent : colors.danger}
                    />
                    <Text style={[styles.rankDeltaText, rankDelta < 0 && styles.rankDeltaDown]}>
                      {rankDelta > 0 ? `+${rankDelta}` : rankDelta}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {data.passed.length > 0 && (
            <View style={styles.passedRow}>
              <MaterialCommunityIcons name="crown" size={18} color={colors.gold} />
              <Text style={styles.passed}>Tu passes devant {data.passed.join(", ")} !</Text>
            </View>
          )}
        </View>
      )}

      {data && data.results.length === 0 && <Text style={styles.empty}>Aucun match terminé pour l&apos;instant.</Text>}

      {rows}

      {leagueId && leagueName && (
        <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Ranking", { leagueId, leagueName })}>
          <Text style={styles.buttonText}>VOIR LE CLASSEMENT</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  summary: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  weekPoints: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: "900",
  },
  rankLabel: {
    marginTop: 12,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rank: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  rankDelta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rankDeltaText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: "900",
  },
  rankDeltaDown: {
    color: colors.danger,
  },
  passedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  passed: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "800",
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  cardDate: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  score: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  prono: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  tags: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  pointsBadge: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900",
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
