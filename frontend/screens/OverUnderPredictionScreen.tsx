import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import Countdown from "../components/Countdown";
import BonusBar from "../components/BonusBar";

type Props = NativeStackScreenProps<RootStackParamList, "OverUnderPrediction">;

type Winner = "home" | "away";
type OverUnder = "over" | "under";

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// One of the two big buttons: highlighted when selected
function ChoiceButton({ label, selected, onPress }: ChoiceProps) {
  return (
    <TouchableOpacity style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function OverUnderPredictionScreen({ navigation, route }: Props) {
  const { gridId, event, prediction } = route.params;
  const payload = prediction?.payload;
  const token = useSelector((state: RootState) => state.user.value.token);

  // Pre-filled with my saved prediction
  const [winner, setWinner] = useState<Winner | null>((payload?.winner as Winner | undefined) ?? null);
  const [overUnder, setOverUnder] = useState<OverUnder | null>(payload?.overUnder ?? null);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");

    if (!winner || !overUnder) {
      setError("Answer both questions");
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        gridId,
        eventId: event._id,
        payload: { winner, overUnder },
      }),
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{event.competition.toUpperCase()}</Text>
      </View>

      <Countdown lockAt={event.lockAt} />

      <Text style={styles.question}>Qui gagne ?</Text>
      <View style={styles.choiceRow}>
        <ChoiceButton
          label={event.homeTeam?.name ?? "Domicile"}
          selected={winner === "home"}
          onPress={() => setWinner("home")}
        />
        <ChoiceButton
          label={event.awayTeam?.name ?? "Extérieur"}
          selected={winner === "away"}
          onPress={() => setWinner("away")}
        />
      </View>

      <Text style={styles.question}>Total de points : {event.ouLine}</Text>
      <View style={styles.choiceRow}>
        <ChoiceButton
          label={`Moins de ${event.ouLine}`}
          selected={overUnder === "under"}
          onPress={() => setOverUnder("under")}
        />
        <ChoiceButton
          label={`Plus de ${event.ouLine}`}
          selected={overUnder === "over"}
          onPress={() => setOverUnder("over")}
        />
      </View>

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
  question: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  choice: {
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  choiceSelected: {
    borderColor: colors.accent,
  },
  choiceText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800",
  },
  choiceTextSelected: {
    color: colors.accent,
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
  },
  buttonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
  },
});
