import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import { updateInventory } from "../reducers/user";
import type { Bonus } from "../types";

type Props = {
  predictionId?: string;
  initialBonus?: Bonus;
};

type BonusKind = keyof Bonus;

const BONUSES: { kind: BonusKind; label: string; icon: "flash-outline" | "umbrella-outline" | "shield-outline" }[] = [
  { kind: "doubleur", label: "Doubleur", icon: "flash-outline" },
  { kind: "assurance", label: "Assurance", icon: "umbrella-outline" },
  { kind: "bouclier", label: "Bouclier", icon: "shield-outline" },
];

// The 3 bonuses of one prediction — each tap turns one on or off right away
export default function BonusBar({ predictionId, initialBonus }: Props) {
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

  // A bonus goes on a saved prediction: nothing to attach it to yet
  if (!predictionId) {
    return <Text style={styles.hint}>Valide ton prono pour pouvoir y mettre un bonus.</Text>;
  }

  const buttons = BONUSES.map((item) => {
    const isActive = bonus[item.kind];
    const stock = inventory?.[item.kind] ?? 0;

    return (
      <TouchableOpacity
        key={item.kind}
        style={[styles.bonus, isActive && styles.bonusActive]}
        onPress={() => toggle(item.kind)}
        disabled={!isActive && stock === 0}
      >
        <Ionicons name={item.icon} size={22} color={isActive ? colors.accent : stock === 0 ? colors.border : colors.text} />
        <Text style={[styles.label, isActive && styles.labelActive, !isActive && stock === 0 && styles.labelEmpty]}>
          {item.label}
        </Text>
        <Text style={styles.stock}>{isActive ? "activé" : `×${stock}`}</Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bonus</Text>
      <View style={styles.row}>{buttons}</View>
      {error !== "" && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  bonus: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
  },
  bonusActive: {
    borderColor: colors.accent,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  labelActive: {
    color: colors.accent,
  },
  labelEmpty: {
    color: colors.muted,
  },
  stock: {
    color: colors.muted,
    fontSize: 12,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
