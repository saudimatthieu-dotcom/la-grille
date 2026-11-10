import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { GRID_TYPES } from "../config/gridTypes";
import type { PickEvent } from "../types";
import PickRow from "../components/PickRow";
import WeekPicker from "../components/WeekPicker";
import { formatWeek } from "../utils/format";
import { loadPicks, savePicks } from "../data/picks";

type Props = NativeStackScreenProps<RootStackParamList, "Picks">;

// The grid types whose matches the admins pick (sur-mesure leagues pick their own)
const ADMIN_TYPES = GRID_TYPES.filter((type) => type.value !== "surmesure");

// The matches of a week, ticked by hand: by an admin for a grid type, or by the VIP owner of a sur-mesure league
export default function PicksScreen({ navigation, route }: Props) {
  const { leagueId, leagueName } = route.params ?? {};
  const token = useSelector((state: RootState) => state.user.value.token);

  // No league: the admin screen — one grid type at a time
  const [gridType, setGridType] = useState("officielle");
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const [season, setSeason] = useState(0);
  const [week, setWeek] = useState(0);
  const [events, setEvents] = useState<PickEvent[]>([]);
  // What's ticked on screen, and what the server has: ENREGISTRER only when they differ
  const [picked, setPicked] = useState<string[]>([]);
  const [savedPicked, setSavedPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const owner = leagueId ? { leagueId } : { gridType };

  // Shows what GET or PUT /picks sent back
  const showWeek = (data: {
    season: number;
    week: number;
    maxOffset: number;
    events: PickEvent[];
    picked: string[];
  }) => {
    setSeason(data.season);
    setWeek(data.week);
    setMaxOffset(data.maxOffset);
    setEvents(data.events);
    setPicked(data.picked);
    setSavedPicked(data.picked);
  };

  useEffect(() => {
    setError("");
    setMessage("");

    loadPicks(token, leagueId ? { leagueId } : { gridType }, offset)
      .then((data) => {
        if (data.result) {
          showWeek(data);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  }, [token, leagueId, gridType, offset]);

  const toggle = (eventId: string) => {
    setMessage("");
    setPicked(picked.includes(eventId) ? picked.filter((id) => id !== eventId) : [...picked, eventId]);
  };

  // eventIds: the ticked matches — an empty list leaves the week without matches
  const save = (eventIds: string[]) => {
    setError("");
    setMessage("");

    savePicks({ token, ...owner, offset, eventIds })
      .then((data) => {
        if (data.result) {
          showWeek(data);
          setMessage("Grille enregistrée ✓");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  const hasChanges = picked.length !== savedPicked.length || picked.some((id) => !savedPicked.includes(id));

  const typeChips = ADMIN_TYPES.map((type) => (
    <TouchableOpacity
      key={type.value}
      style={[styles.chip, gridType === type.value && styles.chipSelected]}
      onPress={() => setGridType(type.value)}
    >
      <Text style={[styles.chipText, gridType === type.value && styles.chipTextSelected]}>{type.label}</Text>
    </TouchableOpacity>
  ));

  const rows = events.map((event) => (
    <PickRow key={event._id} event={event} isPicked={picked.includes(event._id)} onToggle={() => toggle(event._id)} />
  ));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>CHOISIR LES MATCHS</Text>
            <Text style={styles.subtitle}>{leagueId ? leagueName : "Admin · grilles de la semaine"}</Text>
          </View>
        </View>

        {!leagueId && <View style={styles.chips}>{typeChips}</View>}

        <WeekPicker offset={offset} maxOffset={maxOffset} season={season} week={week} onChange={setOffset} />

        <Text style={styles.hint}>
          {picked.length === 0
            ? `Aucun match coché : la grille de la semaine du ${formatWeek(season, week)} sera vide, les joueurs n'auront rien à pronostiquer.`
            : `${picked.length} match${picked.length > 1 ? "s" : ""} coché${picked.length > 1 ? "s" : ""} : les joueurs ne verront que ceux-là cette semaine-là.`}
        </Text>

        {events.length === 0 && error === "" && (
          <Text style={styles.empty}>Pas encore de match importé pour cette semaine.</Text>
        )}

        {rows}
      </ScrollView>

      <View style={styles.footer}>
        {error !== "" && <Text style={styles.error}>{error}</Text>}
        {message !== "" && <Text style={styles.message}>{message}</Text>}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.secondaryButton, savedPicked.length === 0 && styles.buttonDisabled]}
            onPress={() => save([])}
            disabled={savedPicked.length === 0}
          >
            <Text style={styles.secondaryText}>AUTOMATIQUE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !hasChanges && styles.buttonDisabled]}
            onPress={() => save(picked)}
            disabled={!hasChanges}
          >
            <Text style={styles.buttonText}>ENREGISTRER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    paddingBottom: 24,
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
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  chipTextSelected: {
    color: colors.bg,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.bg,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    color: colors.accent,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    flex: 1,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
