import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { SPORT_ICONS } from "../config/sports";
import { GRID_TYPES } from "../config/gridTypes";
import type { PickEvent } from "../types";
import { eventTitle, formatDay, formatTime, formatWeek } from "../utils/format";

type Props = NativeStackScreenProps<RootStackParamList, "Picks">;

// The grid types whose matches the admins pick (sur-mesure leagues pick their own)
const ADMIN_TYPES = GRID_TYPES.filter((type) => type.value !== "surmesure");

const WEEK_LABELS = ["Cette semaine", "Semaine prochaine", "Dans 2 semaines", "Dans 3 semaines"];

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

    const query = leagueId ? `leagueId=${leagueId}` : `gridType=${gridType}`;

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/picks/${token}?${query}&offset=${offset}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          showWeek(data);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [token, leagueId, gridType, offset]);

  const toggle = (eventId: string) => {
    setMessage("");
    setPicked(picked.includes(eventId) ? picked.filter((id) => id !== eventId) : [...picked, eventId]);
  };

  // eventIds: the ticked matches — an empty list puts the grid back on automatic
  const save = (eventIds: string[]) => {
    setError("");
    setMessage("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/picks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...owner, offset, eventIds }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          showWeek(data);
          setMessage("Grille enregistrée ✓");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
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

  const rows = events.map((event) => {
    const isPicked = picked.includes(event._id);
    // A match that has started can't be added any more (it can still be taken out if nobody predicted it)
    const isDisabled = event.isLocked && !isPicked;

    return (
      <TouchableOpacity
        key={event._id}
        style={[styles.row, isDisabled && styles.rowDisabled]}
        onPress={() => toggle(event._id)}
        disabled={isDisabled}
      >
        <View style={styles.kickoff}>
          <Text style={styles.kickoffTime}>{formatTime(event.startsAt)}</Text>
          <Text style={styles.kickoffDay} numberOfLines={1} adjustsFontSizeToFit>
            {formatDay(event.startsAt)}
          </Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{eventTitle(event)}</Text>
          <View style={styles.rowInfoLine}>
            <Ionicons name={SPORT_ICONS[event.sport]} size={14} color={colors.accent} />
            <Text style={styles.rowInfo}>{event.competition}</Text>
          </View>
        </View>
        <Ionicons
          name={isPicked ? "checkbox" : "square-outline"}
          size={24}
          color={isPicked ? colors.accent : colors.muted}
        />
      </TouchableOpacity>
    );
  });

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

        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => setOffset(offset - 1)} disabled={offset === 0}>
            <Ionicons name="chevron-back-circle" size={30} color={offset === 0 ? colors.border : colors.accent} />
          </TouchableOpacity>
          <View style={styles.weekLabel}>
            <Text style={styles.weekTitle}>{WEEK_LABELS[offset]}</Text>
            {week > 0 && (
              <Text style={styles.weekDates}>
                Semaine {week} · {formatWeek(season, week)}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setOffset(offset + 1)} disabled={offset >= maxOffset}>
            <Ionicons
              name="chevron-forward-circle"
              size={30}
              color={offset >= maxOffset ? colors.border : colors.accent}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          {picked.length === 0
            ? `Aucun match coché : les joueurs verront automatiquement les ${events.length} matchs de la semaine du ${formatWeek(season, week)}, et seulement ceux-là.`
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
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  weekLabel: {
    alignItems: "center",
  },
  weekTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  weekDates: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
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
  rowDisabled: {
    opacity: 0.4,
  },
  kickoff: {
    width: 72,
    alignItems: "center",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  kickoffTime: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  kickoffDay: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  rowInfoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  rowInfo: {
    color: colors.muted,
    fontSize: 13,
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
