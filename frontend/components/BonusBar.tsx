import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import type { BonusKind } from "../types";
import { maxPoints } from "../utils/format";

type Props = {
  sport: string;
  predictionId?: string;
  // The league the prediction screen was opened from (none from the Grille tab)
  leagueId?: string;
};

// One of my private leagues, as GET /tactics/bonus sends it
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

// The potential points, then my bonuses in one league: one chip per private league, one switch per bonus
export default function BonusBar({ sport, predictionId, leagueId }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  // null = still loading
  const [leagues, setLeagues] = useState<LeagueBonus[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(leagueId);
  const [error, setError] = useState("");

  // My bonus on this prediction in each of my private leagues, and what I have left this week
  useEffect(() => {
    if (!predictionId) {
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/tactics/bonus/${predictionId}/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLeagues(data.leagues);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [predictionId, token]);

  // The league I came from — or my first private league (from the Grille tab, or from the public league)
  const selected = leagues?.find((league) => league.leagueId === selectedId) ?? leagues?.[0];

  const toggle = (kind: BonusKind) => {
    if (!selected) {
      return;
    }

    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/tactics/bonus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, predictionId, leagueId: selected.leagueId, kind }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          // Only this league changes: the bonus is put (or taken off) there and nowhere else
          setLeagues((current) =>
            (current ?? []).map((league) => (league.leagueId === data.league.leagueId ? data.league : league))
          );
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const max = maxPoints(sport);
  const potential = selected?.active === "doubleur" ? max * 2 : max;

  // No Assurance in F1 and cycling (same rule as the backend's isBonusAllowed)
  const bonuses = BONUSES.filter((item) => !(item.kind === "assurance" && (sport === "f1" || sport === "cyclisme")));

  const rows = bonuses.map((item) => {
    const isActive = selected?.active === item.kind;
    const stock = selected?.stock[item.kind] ?? 0;
    // Bonuses don't stack: once one is on, the others wait until it's taken off
    const hasOtherBonus = Boolean(selected?.active) && !isActive;
    const isDisabled = !selected || (!isActive && (stock <= 0 || hasOtherBonus));

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

  const chips = (leagues ?? []).map((league) => {
    const isSelected = league.leagueId === selected?.leagueId;

    return (
      <TouchableOpacity
        key={league.leagueId}
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => setSelectedId(league.leagueId)}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {league.active ? "● " : ""}
          {league.leagueName}
        </Text>
      </TouchableOpacity>
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

      {predictionId && leagues && leagues.length === 0 && (
        <Text style={styles.hint}>Les bonus se jouent dans les ligues privées : crée ou rejoins une ligue.</Text>
      )}

      {predictionId && leagues && leagues.length > 0 && (
        <>
          <Text style={styles.hint}>1 bonus par prono et par ligue · 1 de chaque par semaine</Text>
          {leagues.length > 1 && <View style={styles.chips}>{chips}</View>}
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  chipSelected: {
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  chipTextSelected: {
    color: colors.accent,
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
