import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { SPORT_ICONS } from "../config/sports";
import Countdown from "../components/Countdown";
import type { SportEvent } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "League">;

export default function LeagueScreen({ navigation, route }: Props) {
  const { leagueId, leagueName } = route.params;
  const token = useSelector((state: RootState) => state.user.value.token);

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [error, setError] = useState("");
  const [lockAt, setLockAt] = useState("");
  const [gridId, setGridId] = useState("");

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/grids/league/${leagueId}/current/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setEvents(data.grid.events);
          setLockAt(data.grid.lockAt);
          setGridId(data.grid._id);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [leagueId, token]);

  const matchRows = events.map((event) => {
    const title =
      event.homeTeam && event.awayTeam
        ? `${event.homeTeam.name} – ${event.awayTeam.name}`
        : event.competition;

    const date = new Date(event.startsAt).toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const info = event.homeTeam ? `${event.competition} · ${date}` : date;

    return (
      <TouchableOpacity
        key={event._id}
        style={styles.row}
        onPress={() => {
          if (event.sport === "football") {
            navigation.navigate("FootballPrediction", { gridId, event });
          }
        }}
      >
        <Ionicons name={SPORT_ICONS[event.sport]} size={24} color={colors.accent} />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowInfo}>{info}</Text>
        </View>
      </TouchableOpacity>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{leagueName.toUpperCase()}</Text>
      </View>

      <Text style={styles.subtitle}>Grille de la semaine · {events.length} matchs</Text>

      {lockAt !== "" && <Countdown lockAt={lockAt} />}

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {matchRows}
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
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  rowInfo: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
});
