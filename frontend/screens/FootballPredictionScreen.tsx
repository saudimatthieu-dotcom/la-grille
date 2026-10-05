import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import Countdown from "../components/Countdown";
import BonusBar from "../components/BonusBar";
import TeamLogo from "../components/TeamLogo";

type Props = NativeStackScreenProps<RootStackParamList, "FootballPrediction">;

// Keep digits only: "2a" → "2"
function onlyDigits(text: string) {
  return text.replace(/[^0-9]/g, "");
}

export default function FootballPredictionScreen({ navigation, route }: Props) {
  const { gridId, event, prediction, leagueId } = route.params;
  const payload = prediction?.payload;
  const token = useSelector((state: RootState) => state.user.value.token);

  // Pre-filled with my saved prediction (!== undefined so that a 0 still counts)
  const [homeScore, setHomeScore] = useState(
    payload?.homeScore !== undefined ? String(payload.homeScore) : ""
  );
  const [awayScore, setAwayScore] = useState(
    payload?.awayScore !== undefined ? String(payload.awayScore) : ""
  );
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");

    if (homeScore === "" || awayScore === "") {
      setError("Enter both scores");
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        gridId,
        eventId: event._id,
        payload: { homeScore: Number(homeScore), awayScore: Number(awayScore) },
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

      <View style={styles.scoreRow}>
        <View style={styles.team}>
          <TeamLogo logo={event.homeTeam?.logo} />
          <Text style={styles.teamName}>{event.homeTeam?.name}</Text>
          <TextInput
            style={styles.scoreInput}
            value={homeScore}
            onChangeText={(text) => setHomeScore(onlyDigits(text))}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>

        <Text style={styles.separator}>–</Text>

        <View style={styles.team}>
          <TeamLogo logo={event.awayTeam?.logo} />
          <Text style={styles.teamName}>{event.awayTeam?.name}</Text>
          <TextInput
            style={styles.scoreInput}
            value={awayScore}
            onChangeText={(text) => setAwayScore(onlyDigits(text))}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>

      <BonusBar sport={event.sport} predictionId={prediction?._id} leagueId={leagueId} />

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
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  team: {
    flex: 1,
    alignItems: "center",
  },
  teamName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  scoreInput: {
    width: 90,
    height: 90,
    borderColor: colors.accent,
    borderWidth: 2,
    borderRadius: 16,
    color: colors.accent,
    fontSize: 44,
    fontWeight: "900",
    textAlign: "center",
  },
  separator: {
    color: colors.muted,
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 20,
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
