import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import type { BonusKind } from "../types";
import { maxPoints } from "../utils/format";

type Props = {
  sport: string;
  predictionId?: string;
};

// The prediction's league, as GET /tactics/bonus sends it (null: the public league, no bonus)
type LeagueBonus = {
  leagueId: string;
  leagueName: string;
  active: BonusKind | null;
  stock: Record<BonusKind, number>;
};

const BONUSES: { kind: BonusKind; label: string; description: string; icon: "flash" | "umbrella" | "shield" }[] = [
  { kind: "doubleur", label: "Doubleur", description: "Double tes points", icon: "flash" },
  { kind: "bouclier", label: "Bouclier", description: "Protège du sabotage", icon: "shield" },
  { kind: "assurance", label: "Assurance", description: "Le max même si tu es en partie juste", icon: "umbrella" },
];

// The potential points, then one switch per bonus — they count in the prediction's league
export default function BonusBar({ sport, predictionId }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  // undefined = still loading, null = the public league (no bonus)
  const [league, setLeague] = useState<LeagueBonus | null | undefined>(undefined);
  const [error, setError] = useState("");

  // My bonus on this prediction, and what I have left this week in its league
  useEffect(() => {
    if (!predictionId) {
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/tactics/bonus/${predictionId}/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLeague(data.league);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [predictionId, token]);

  const toggle = (kind: BonusKind) => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/tactics/bonus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, predictionId, kind }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLeague(data.league);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const max = maxPoints(sport);
  const potential = league?.active === "doubleur" ? max * 2 : max;

  // No Assurance in F1 and cycling (same rule as the backend's isBonusAllowed)
  const bonuses = BONUSES.filter((item) => !(item.kind === "assurance" && (sport === "f1" || sport === "cyclisme")));

  const rows = bonuses.map((item) => {
    const isActive = league?.active === item.kind;
    const stock = league?.stock[item.kind] ?? 0;
    // Bonuses don't stack: once one is on, the others wait until it's taken off
    const hasOtherBonus = Boolean(league?.active) && !isActive;
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
          onValueChange={() => toggle(item.kind)}
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

      {!predictionId && <Text style={styles.hint}>Valide ton prono d&apos;abord pour pouvoir y mettre un bonus.</Text>}

      {predictionId && league === null && (
        <Text style={styles.hint}>
          Pas de bonus dans la ligue publique : ouvre ce match depuis une de tes ligues privées.
        </Text>
      )}

      {predictionId && league && (
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
