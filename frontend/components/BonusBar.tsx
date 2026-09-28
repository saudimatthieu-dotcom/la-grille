import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import { updateInventory } from "../reducers/user";
import type { Bonus } from "../types";
import { maxPoints } from "../utils/format";

type Props = {
  sport: string;
  predictionId?: string;
  initialBonus?: Bonus;
};

type BonusKind = keyof Bonus;

// The potential points, then one switch per bonus — each switch turns it on or off right away
export default function BonusBar({ sport, predictionId, initialBonus }: Props) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.user.value.token);
  const inventory = useSelector((state: RootState) => state.user.value.inventory);

  const [bonus, setBonus] = useState<Bonus>(initialBonus ?? { doubleur: false, assurance: false, bouclier: false });
  const [error, setError] = useState("");

  // The inventory saved at login can be old (weekly doubleur, bonuses used on another phone)
  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/me/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          dispatch(updateInventory(data.user.inventory));
        }
      })
      .catch(() => {});
  }, [dispatch, token]);

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
          setBonus(data.bonus);
          dispatch(updateInventory(data.inventory));
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const max = maxPoints(sport);
  const potential = bonus.doubleur ? max * 2 : max;

  const bonuses: { kind: BonusKind; label: string; description: string; icon: "flash" | "umbrella" | "shield" }[] = [
    { kind: "doubleur", label: "Doubleur", description: `${max} → ${max * 2} pts`, icon: "flash" },
    { kind: "bouclier", label: "Bouclier", description: "Protège du sabotage", icon: "shield" },
    { kind: "assurance", label: "Assurance", description: "Le max même si tu es en partie juste", icon: "umbrella" },
  ];

  const rows = bonuses.map((item) => {
    const isActive = bonus[item.kind];
    const stock = inventory?.[item.kind] ?? 0;
    const isDisabled = !predictionId || (!isActive && stock === 0);

    return (
      <View key={item.kind} style={[styles.row, isDisabled && styles.rowDisabled]}>
        <Ionicons name={item.icon} size={22} color={isActive ? colors.accent : colors.text} />
        <View style={styles.rowBody}>
          <Text style={styles.label}>
            {item.label} <Text style={styles.stock}>×{stock}</Text>
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
      <View style={styles.list}>{rows}</View>
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
