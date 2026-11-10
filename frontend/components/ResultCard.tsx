import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { TacticKind } from "../config/bonuses";
import { SPORT_ICONS } from "../config/sports";
import { colors } from "../config/theme";
import type { Bonus, PredictionPayload, SportEvent } from "../types";
import { eventTitle, formatDate, formatPayload, formatResult } from "../utils/format";
import TacticIcon from "./TacticIcon";

// One match of my grid, as the results route sends it
export type ResultItem = {
  event: SportEvent;
  payload: PredictionPayload | null;
  bonus: Bonus | null;
  points: number | null;
  sabotaged: boolean;
  shieldTriggered: boolean;
};

// Short tags explaining the points, each with its neon icon: Doubleur, Saboté…
function tagsOf(item: ResultItem) {
  const tags: { kind: TacticKind; label: string }[] = [];

  if (item.sabotaged) {
    tags.push(
      item.shieldTriggered ? { kind: "bouclier", label: "Sabotage bloqué" } : { kind: "sabotage", label: "Saboté" }
    );
  } else if (item.bonus?.bouclier) {
    tags.push({ kind: "bouclier", label: "Bouclier" });
  }
  if (item.bonus?.doubleur) {
    tags.push({ kind: "doubleur", label: "Doubleur" });
  }
  if (item.bonus?.assurance) {
    tags.push({ kind: "assurance", label: "Assurance" });
  }
  return tags;
}

// One finished match on the Résultats page: the real result, my prediction, my bonuses and my points
export default function ResultCard({ item }: { item: ResultItem }) {
  const tags = tagsOf(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={SPORT_ICONS[item.event.sport]} size={20} color={colors.accent} />
        <Text style={styles.cardTitle}>{eventTitle(item.event)}</Text>
        <Text style={styles.score}>{formatResult(item.event)}</Text>
      </View>
      <Text style={styles.cardDate}>{formatDate(item.event.startsAt)}</Text>

      <Text style={styles.label}>TON PRONO</Text>
      <Text style={styles.prono}>{item.payload ? formatPayload(item.event, item.payload) : "Pas de prono"}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag.label} style={styles.tag}>
              <TacticIcon kind={tag.kind} size={32} />
              <Text style={styles.tagText}>{tag.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{item.points != null ? `+${item.points} pts` : "—"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  cardDate: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  score: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  prono: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  tags: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tagText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  pointsBadge: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900",
  },
});
