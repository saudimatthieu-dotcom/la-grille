import { ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "../config/theme";
import WeekGrid from "../components/WeekGrid";

// The Grille tab: the general grid, open to every player — no league or code needed
export default function GridsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>LA GRILLE</Text>
      <Text style={styles.subtitle}>Toutes les rencontres de la semaine</Text>

      <WeekGrid />
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
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
});
