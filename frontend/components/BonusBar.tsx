import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { BONUSES } from "../config/bonuses";
import { colors } from "../config/theme";
import type { BonusKind } from "../types";
import { maxPoints } from "../utils/format";

type Props = {
  sport: string;
  gridId: string;
  // The league the prediction is for (none: the public league, no bonus)
  leagueId?: string;
  // My saved prediction, if any: its bonus counts as still available
  predictionId?: string;
  // The bonus chosen on screen — saved with the prediction by VALIDER MON PRONO
  value: BonusKind | null;
  onChange: (kind: BonusKind | null) => void;
};

// What I have left this week in the league, as GET /tactics/bonus sends it
type LeagueStock = {
  leagueId: string;
  leagueName: string;
  stock: Record<BonusKind, number>;
};

// The potential points, then one switch per bonus — the choice is saved with the prediction, in its league
export default function BonusBar({ sport, gridId, leagueId, predictionId, value, onChange }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  // undefined = still loading, null = the public league (no bonus)
  const [league, setLeague] = useState<LeagueStock | null | undefined>(leagueId ? undefined : null);
  const [error, setError] = useState("");

  // What's left of my week's bonuses in this league (the public league has none: nothing to ask)
  useEffect(() => {
    if (!leagueId) {
      return;
    }

    const query = predictionId ? `&predictionId=${predictionId}` : "";

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/tactics/bonus/${gridId}/${token}?leagueId=${leagueId}${query}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLeague(data.league);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [gridId, leagueId, predictionId, token]);

  const max = maxPoints(sport);
  const potential = value === "doubleur" ? max * 2 : max;

  // No Assurance in F1 and cycling (same rule as the backend's isBonusAllowed)
  const bonuses = BONUSES.filter((item) => !(item.kind === "assurance" && (sport === "f1" || sport === "cyclisme")));

  const rows = bonuses.map((item) => {
    const isActive = value === item.kind;
    // What's left once this choice is saved
    const stock = (league?.stock[item.kind] ?? 0) - (isActive ? 1 : 0);
    // Bonuses don't stack: once one is on, the others wait until it's taken off
    const hasOtherBonus = Boolean(value) && !isActive;
    const isDisabled = !league || (!isActive && (stock <= 0 || hasOtherBonus));

    return (
      <View key={item.kind} style={[styles.row, isDisabled && styles.rowDisabled]}>
        <Ionicons name={item.icon} size={22} color={isActive ? colors.accent : colors.text} />
        <View style={styles.rowBody}>
          <Text style={styles.label}>
            {item.label} <Text style={styles.stock}>×{Math.max(stock, 0)}</Text>
          </Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={() => onChange(isActive ? null : item.kind)}
          disabled={isDisabled}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.text}
        />
      </View>
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.potentialRow}>
        <Text style={styles.potentialLabel}>Potentiel</Text>
        <Text style={styles.potential}>
          ⭐ {sport === "f1" ? "jusqu'à " : ""}
          {potential} points
        </Text>
      </View>

      <Text style={styles.title}>BONUS</Text>

      {league === null && (
        <Text style={styles.hint}>
          Pas de bonus dans la ligue publique : ouvre ce match depuis une de tes ligues privées.
        </Text>
      )}

      {league && (
        <>
          <Text style={styles.hint}>
            {league.leagueName} · 1 bonus par prono · 1 de chaque par semaine
          </Text>
          <View style={styles.list}>{rows}</View>
        </>
      )}

      {error !== "" && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  potentialRow: {
    marginBottom: 16,
  },
  potentialLabel: {
    color: colors.muted,
    fontSize: 14,
  },
  potential: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 8,
  },
  list: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowBody: {
    flex: 1,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  stock: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 1,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
