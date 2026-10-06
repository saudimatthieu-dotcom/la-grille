import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { SPORT_ICONS, SPORT_LABELS } from "../config/sports";
import ProgressBar from "../components/ProgressBar";

type Props = NativeStackScreenProps<RootStackParamList, "Stats">;

type BonusStat = { used: number; paid: number };

// What GET /users/me/stats sends back
type Stats = {
  total: number;
  correct: number;
  perfect: number;
  bySport: { sport: string; total: number; correct: number }[];
  bonuses: { doubleur: BonusStat; assurance: BonusStat; bouclier: BonusStat };
};

// 3 / 4 → "75 %" — and "—" when there's nothing to count yet
function percent(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)} %` : "—";
}

// My stats on every scored prediction, in all my leagues
export default function StatsScreen({ navigation }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/me/stats/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setStats(data.stats);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [token]);

  const sportRows = (stats?.bySport ?? []).map((row) => (
    <View key={row.sport} style={styles.sportRow}>
      <Ionicons
        name={SPORT_ICONS[row.sport as keyof typeof SPORT_ICONS] ?? "trophy-outline"}
        size={20}
        color={colors.accent}
      />
      <View style={styles.sportBody}>
        <View style={styles.sportLine}>
          <Text style={styles.sportName}>{SPORT_LABELS[row.sport] ?? row.sport}</Text>
          <Text style={styles.sportPercent}>
            {percent(row.correct, row.total)} <Text style={styles.muted}>({row.correct}/{row.total})</Text>
          </Text>
        </View>
        <ProgressBar value={row.correct} max={row.total} />
      </View>
    </View>
  ));

  const bonusRows = stats
    ? [
        { label: "⚡ Doubleur", hint: "a doublé des points", stat: stats.bonuses.doubleur },
        { label: "☂️ Assurance", hint: "a donné le max", stat: stats.bonuses.assurance },
        { label: "🛡️ Bouclier", hint: "a bloqué un sabotage", stat: stats.bonuses.bouclier },
      ].map((item) => (
        <View key={item.label} style={styles.bonusRow}>
          <View style={styles.bonusBody}>
            <Text style={styles.bonusLabel}>{item.label}</Text>
            <Text style={styles.muted}>{item.hint}</Text>
          </View>
          <Text style={styles.bonusValue}>
            {item.stat.paid} / {item.stat.used}
          </Text>
        </View>
      ))
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>MES STATS</Text>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {stats && stats.total === 0 && (
        <Text style={styles.empty}>Pas encore de stats : elles arrivent dès que tes premiers matchs sont terminés.</Text>
      )}

      {stats && stats.total > 0 && (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.bigNumber}>{percent(stats.correct, stats.total)}</Text>
              <Text style={styles.muted}>pronos justes</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.bigNumber}>{percent(stats.perfect, stats.total)}</Text>
              <Text style={styles.muted}>pronos parfaits</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.bigNumber}>{stats.total}</Text>
              <Text style={styles.muted}>pronos joués</Text>
            </View>
          </View>
          <Text style={styles.hint}>
            Juste = au moins 1 point. Parfait = le maximum du sport (score exact, podium parfait…). Toutes tes ligues
            comptent.
          </Text>

          <Text style={styles.section}>Par sport</Text>
          <View style={styles.card}>{sportRows}</View>

          <Text style={styles.section}>Bonus bien placés</Text>
          <View style={styles.card}>{bonusRows}</View>
        </>
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
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  summary: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  bigNumber: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  sportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  sportBody: {
    flex: 1,
    gap: 6,
  },
  sportLine: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sportName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  sportPercent: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  bonusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  bonusBody: {
    flex: 1,
  },
  bonusLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  bonusValue: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
  },
});
