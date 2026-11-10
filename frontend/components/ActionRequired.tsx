import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../config/theme";

type Props = {
  // How many of my grids still miss a prediction
  count: number;
  onPress: () => void;
};

// The "ACTION REQUISE" box of the home page: shown while a grid is to complete
export default function ActionRequired({ count, onPress }: Props) {
  return (
    <View style={styles.action}>
      <View style={styles.actionTitleRow}>
        <Ionicons name="flash" size={20} color={colors.accent} />
        <Text style={styles.actionLabel}>ACTION REQUISE</Text>
      </View>
      <Text style={styles.actionText}>
        {count} grille{count > 1 ? "s" : ""} à compléter
      </Text>
      <TouchableOpacity style={styles.actionButton} onPress={onPress}>
        <Text style={styles.actionButtonText}>VOIR MES GRILLES →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  actionText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  actionButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: "900",
  },
});
