import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "../config/theme";
import type { Report } from "../data/useReports";

// The reasons players can give, as the server keeps them
const REASON_LABELS: Record<string, string> = {
  harcelement: "Harcèlement",
  haine: "Haine ou discrimination",
  spam: "Spam",
  autre: "Autre",
};

type Props = {
  report: Report;
  onHide: () => void;
  onDismiss: () => void;
};

// One reported message on the admin page: who wrote it, why it was reported, and what to do about it
export default function ReportRow({ report, onHide, onDismiss }: Props) {
  return (
    <View style={styles.report}>
      <Text style={styles.reason}>{REASON_LABELS[report.reason] ?? report.reason}</Text>
      <Text style={styles.text}>« {report.text} »</Text>
      <Text style={styles.muted}>
        De {report.author} dans {report.leagueName} · signalé par {report.reporter}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.hideButton} onPress={onHide}>
          <Text style={styles.hideText}>Masquer le message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissText}>Ignorer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  report: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  reason: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  text: {
    color: colors.text,
    fontSize: 15,
  },
  muted: {
    color: colors.muted,
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  hideButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hideText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: "900",
  },
  dismissButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dismissText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
