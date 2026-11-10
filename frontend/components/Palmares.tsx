import { StyleSheet, Text, View } from "react-native";

import { colors } from "../config/theme";
import type { MonthlyWinners, PastSeason } from "../types";

const MEDALS = ["🥇", "🥈", "🥉"];

// "octobre 2026" for "2026-10"
function monthName(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

type Props = {
  // A private league: the podiums of its past seasons
  pastSeasons?: PastSeason[];
  // The public league: each month's winners
  monthlyWinners?: MonthlyWinners[];
};

// The palmarès under a ranking, newest first. Shows nothing while there is no past season or month
export default function Palmares({ pastSeasons = [], monthlyWinners = [] }: Props) {
  const seasonRows = [...pastSeasons].reverse().map((past) => (
    <View key={past.number} style={styles.palmaresRow}>
      <Text style={styles.palmaresTitle}>Saison {past.number}</Text>
      <Text style={styles.palmaresText}>
        {past.podium.length > 0
          ? past.podium.map((row) => `${MEDALS[row.rank - 1] ?? ""} ${row.username} ${row.points} pts`).join("   ")
          : "Personne n'a marqué de points"}
      </Text>
    </View>
  ));

  const monthRows = [...monthlyWinners].reverse().map((entry) => (
    <View key={entry.month} style={styles.palmaresRow}>
      <Text style={styles.palmaresTitle}>{monthName(entry.month)}</Text>
      <Text style={styles.palmaresText}>
        {entry.winners.length > 0
          ? entry.winners.map((winner) => `👑 ${winner.username} ${winner.points} pts`).join("   ")
          : "Pas de gagnant"}
      </Text>
    </View>
  ));

  if (seasonRows.length === 0 && monthRows.length === 0) {
    return null;
  }

  return (
    <>
      <Text style={styles.palmares}>{seasonRows.length > 0 ? "Palmarès" : "Gagnants des mois passés"}</Text>
      {seasonRows}
      {monthRows}
    </>
  );
}

const styles = StyleSheet.create({
  palmares: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  palmaresRow: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  palmaresTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  palmaresText: {
    color: colors.muted,
    fontSize: 14,
  },
});
