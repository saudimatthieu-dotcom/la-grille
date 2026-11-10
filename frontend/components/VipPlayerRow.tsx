import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "../config/theme";

// A player found by the admin search
export type Player = {
  _id: string;
  username: string;
  email: string;
  isVip: boolean;
  vipUntil: string | null;
};

// "8 nov. 2026"
function formatFullDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  player: Player;
  // months: added to what's left of the pass — 0 takes it away
  onGive: (months: number) => void;
};

// One player on the admin page: their VIP status, and the buttons to give or take the pass
export default function VipPlayerRow({ player, onGive }: Props) {
  return (
    <View style={styles.player}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.username}</Text>
        <Text style={styles.muted}>{player.email}</Text>
        <Text style={[styles.status, player.isVip && styles.statusVip]}>
          {player.isVip && player.vipUntil ? `VIP jusqu'au ${formatFullDate(player.vipUntil)}` : "Pas VIP"}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.smallButton} onPress={() => onGive(1)}>
          <Text style={styles.smallButtonText}>+1 mois</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={() => onGive(12)}>
          <Text style={styles.smallButtonText}>+1 an</Text>
        </TouchableOpacity>
        {player.isVip && (
          <TouchableOpacity style={styles.removeButton} onPress={() => onGive(0)}>
            <Text style={styles.removeText}>Retirer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  player: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  playerInfo: {
    gap: 2,
  },
  playerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  status: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  statusVip: {
    color: colors.gold,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  smallButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: "800",
  },
  removeButton: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
  },
});
