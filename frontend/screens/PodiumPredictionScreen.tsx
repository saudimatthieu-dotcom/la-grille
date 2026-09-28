import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import Countdown from "../components/Countdown";
import BonusBar from "../components/BonusBar";
import type { PredictionPayload } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "PodiumPrediction">;

// F1: a podium of 3 — tennis: winner + finalist
const SLOT_LABELS = {
  f1: ["1er", "2e", "3e"],
  tennis: ["Vainqueur", "Finaliste"],
};

// Rebuild the ordered list of names from a saved prediction
function initialPicks(payload?: PredictionPayload) {
  if (payload?.podium) {
    return payload.podium;
  }
  if (payload?.winner && payload?.finalist) {
    return [payload.winner, payload.finalist];
  }
  return [];
}

export default function PodiumPredictionScreen({ navigation, route }: Props) {
  const { gridId, event, prediction } = route.params;
  const payload = prediction?.payload;
  const token = useSelector((state: RootState) => state.user.value.token);

  const slotLabels = event.sport === "tennis" ? SLOT_LABELS.tennis : SLOT_LABELS.f1;
  const participants = event.participants ?? [];

  const [picks, setPicks] = useState<string[]>(initialPicks(payload));
  const [error, setError] = useState("");

  // Tap a name: add it to the next free slot, or remove it if already picked
  const togglePick = (name: string) => {
    if (picks.includes(name)) {
      setPicks(picks.filter((pick) => pick !== name));
    } else if (picks.length < slotLabels.length) {
      setPicks([...picks, name]);
    }
  };

  const handleSubmit = () => {
    setError("");

    if (picks.length < slotLabels.length) {
      setError("Fill every slot");
      return;
    }

    const payload =
      event.sport === "tennis" ? { winner: picks[0], finalist: picks[1] } : { podium: picks };

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, gridId, eventId: event._id, payload }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          navigation.goBack();
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const slots = slotLabels.map((label, index) => (
    <View key={label} style={[styles.slot, picks[index] && styles.slotFilled]}>
      <Text style={styles.slotLabel}>{label}</Text>
      <Text style={styles.slotName}>{picks[index] ?? "—"}</Text>
    </View>
  ));

  const participantRows = participants.map((participant) => {
    const position = picks.indexOf(participant.name);
    const isPicked = position !== -1;

    return (
      <TouchableOpacity
        key={participant.name}
        style={[styles.participant, isPicked && styles.participantPicked]}
        onPress={() => togglePick(participant.name)}
      >
        <Text style={[styles.participantName, isPicked && styles.participantNamePicked]}>
          {participant.name}
        </Text>
        {isPicked && <Text style={styles.position}>{slotLabels[position]}</Text>}
      </TouchableOpacity>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{event.competition.toUpperCase()}</Text>
      </View>

      <Countdown lockAt={event.lockAt} />

      <View style={styles.slotRow}>{slots}</View>

      <Text style={styles.hint}>Touche un nom pour le placer, touche-le encore pour le retirer.</Text>

      {participantRows}

      <BonusBar predictionId={prediction?._id} initialBonus={prediction?.bonus} />

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>VALIDER MON PRONO</Text>
      </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  slotRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  slot: {
    flex: 1,
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  slotFilled: {
    borderColor: colors.accent,
  },
  slotLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  slotName: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
  },
  participant: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  participantPicked: {
    borderColor: colors.accent,
  },
  participantName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  participantNamePicked: {
    color: colors.accent,
  },
  position: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
  },
});
