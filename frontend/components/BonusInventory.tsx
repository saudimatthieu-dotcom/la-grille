import { StyleSheet, Text, View } from "react-native";

import { BONUSES } from "../config/bonuses";
import { colors } from "../config/theme";
import TacticIcon from "./TacticIcon";

// The "Mes bonus" section of the Profil page: what every player gets each week.
// No stock to show any more: the bonuses are per league and per week, the BonusBar shows them
export default function BonusInventory() {
  return (
    <View>
      <Text style={styles.section}>Mes bonus</Text>
      <View style={styles.inventory}>
        {BONUSES.map((bonus) => (
          <View key={bonus.kind} style={styles.inventoryItem}>
            <TacticIcon kind={bonus.kind} size={40} />
            <Text style={styles.inventoryText}>1 {bonus.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        Chaque semaine, dans chaque ligue privée. Un seul bonus par prono, perdu le lundi s&apos;il n&apos;est pas
        utilisé. Pas d&apos;Assurance en F1 ni en cyclisme.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 8,
  },
  inventory: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  inventoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inventoryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
});
