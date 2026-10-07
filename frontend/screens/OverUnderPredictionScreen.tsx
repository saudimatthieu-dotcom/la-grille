import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import Countdown from "../components/Countdown";
import BonusBar from "../components/BonusBar";
import TeamLogo from "../components/TeamLogo";
import type { BonusKind } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "OverUnderPrediction">;

type Winner = "home" | "draw" | "away";
type OverUnder = "over" | "under";

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// One of the big choice buttons: highlighted when selected
function ChoiceButton({ label, selected, onPress }: ChoiceProps) {
  return (
    <TouchableOpacity style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function OverUnderPredictionScreen({ navigation, route }: Props) {
  const { gridId, event, prediction, leagueId } = route.params;
  const payload = prediction?.payload;
  const token = useSelector((state: RootState) => state.user.value.token);

  // Pre-filled with my saved prediction
  const [winner, setWinner] = useState<Winner | null>((payload?.winner as Winner | undefined) ?? null);
  const [overUnder, setOverUnder] = useState<OverUnder | null>(payload?.overUnder ?? null);
  // Chosen before validating: saved with the prediction
  const [bonus, setBonus] = useState<BonusKind | null>(prediction?.bonus ?? null);
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
        // The league this prediction is for (none: the public league)
        leagueId,
        payload: { winner, overUnder },
        // The bonus goes with it (null: none) — checked before anything is saved
        bonus,
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

      <Countdown lockAt={event.lockAt} startsAt={event.startsAt} />

      <View style={styles.teams}>
        <View style={styles.team}>
          <TeamLogo logo={event.homeTeam?.logo} />
          <Text style={styles.teamName}>{event.homeTeam?.name}</Text>
        </View>
        <Text style={styles.versus}>VS</Text>
        <View style={styles.team}>
          <TeamLogo logo={event.awayTeam?.logo} />
          <Text style={styles.teamName}>{event.awayTeam?.name}</Text>
        </View>
      </View>

      <Text style={styles.question}>Qui gagne ?</Text>
      <View style={styles.choiceRow}>
        <ChoiceButton
          label={event.homeTeam?.name ?? "Domicile"}
          selected={winner === "home"}
          onPress={() => setWinner("home")}
        />
        {/* A draw only in rugby — basket always goes to overtime */}
        {event.sport === "rugby" && (
          <ChoiceButton label="Nul" selected={winner === "draw"} onPress={() => setWinner("draw")} />
        )}
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

      <BonusBar
        sport={event.sport}
        gridId={gridId}
        leagueId={leagueId}
        predictionId={prediction?._id}
        value={bonus}
        onChange={setBonus}
      />

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
  teams: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  team: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  teamName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  versus: {
    color: colors.muted,
    fontSize: 18,
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
