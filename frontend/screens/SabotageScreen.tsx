import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { SPORT_ICONS } from "../config/sports";
import type { SportEvent } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Sabotage">;

export default function SabotageScreen({ navigation, route }: Props) {
  const { leagueId, targetUserId, targetUsername } = route.params;
  const token = useSelector((state: RootState) => state.user.value.token);

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/tactics/sabotage/${leagueId}/${targetUserId}/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setEvents(data.events);
        } else {
          setError(data.error);
        }
        setIsLoaded(true);
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [leagueId, targetUserId, token]);

  const sabotage = (event: SportEvent) => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/tactics/sabotage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, leagueId, targetUserId, eventId: event._id }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          Alert.alert("💣 Sabotage lancé", `Réponse quand le match sera joué… sauf si ${targetUsername} a un Bouclier !`);
          navigation.goBack();
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  // A sabotage can't be undone: ask first
  const confirm = (event: SportEvent, title: string) => {
    Alert.alert("Saboter ce prono ?", `${targetUsername} aura 0 point sur ${title}. Tu n'as qu'un sabotage par semaine.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Saboter", style: "destructive", onPress: () => sabotage(event) },
    ]);
  };

  const eventRows = events.map((event) => {
    const title =
      event.homeTeam && event.awayTeam ? `${event.homeTeam.name} – ${event.awayTeam.name}` : event.competition;

    const date = new Date(event.startsAt).toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity key={event._id} style={styles.row} onPress={() => confirm(event, title)}>
        <Ionicons name={SPORT_ICONS[event.sport]} size={24} color={colors.accent} />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowInfo}>{date}</Text>
        </View>
        <MaterialCommunityIcons name="bomb" size={22} color={colors.danger} />
      </TouchableOpacity>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>SABOTAGE</Text>
      </View>
      <Text style={styles.subtitle}>Choisis un match de {targetUsername} à faire tomber à 0 point.</Text>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {isLoaded && events.length === 0 && error === "" && (
        <Text style={styles.empty}>{targetUsername} n&apos;a aucun prono sabotable pour l&apos;instant.</Text>
      )}

      {eventRows}
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
  },
  title: {
    color: colors.danger,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
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
