import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { OVER_UNDER_SPORTS, PODIUM_SPORTS } from "../config/sports";
import { colors } from "../config/theme";
import Countdown from "./Countdown";
import MatchRow from "./MatchRow";
import ProgressBar from "./ProgressBar";
import SeasonBanner from "./SeasonBanner";
import type { Prediction, SportEvent } from "../types";
import { loadCurrentGrid, loadGridPredictions } from "../data/predictions";

type Props = {
  // Opened from a league: the results then show my rank in it
  leagueId?: string;
  leagueName?: string;
};

// This week's grid, as one league plays it: the matches of its type and my predictions there (none: the public league)
export default function WeekGrid({ leagueId, leagueName }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useSelector((state: RootState) => state.user.value.token);

  const [events, setEvents] = useState<SportEvent[]>([]);
  const [error, setError] = useState("");
  const [gridId, setGridId] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  // Taken when the grid loads (not on every render): decides which matches are still open
  const [now, setNow] = useState(0);
  // Sur-mesure league and I'm its VIP owner: I pick its matches
  const [canPick, setCanPick] = useState(false);
  // The league's season is over: its matches show, but can't be predicted until the next season
  const [seasonOver, setSeasonOver] = useState(false);
  // +1 when the creator starts the next season: loads the grid again
  const [reload, setReload] = useState(0);

  const isFocused = useIsFocused();

  // Runs every time the screen comes back into view, so a new prediction shows up right away
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    // This league's grid: only the matches of its type (none: the public league, the officielle grid)
    loadCurrentGrid(token, leagueId)
      .then((data) => {
        setCanPick(Boolean(data.canPick));

        if (!data.result) {
          setError(data.error);
          return;
        }

        setSeasonOver(Boolean(data.seasonOver));
        setEvents(data.grid.events);
        setGridId(data.grid._id);
        setNow(Date.now());

        // My predictions in this league (none: the public league — the Grille tab)
        return loadGridPredictions(data.grid._id, token, leagueId)
          .then((predictionData) => {
            if (predictionData.result) {
              setPredictions(predictionData.predictions);
            }
          });
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  }, [isFocused, token, leagueId, reload]);

  const weekPoints = predictions.reduce((total, prediction) => total + (prediction.points ?? 0), 0);
  const hasResults = events.some((event) => event.status === "finished");

  // The countdown goes to the next match that locks (the first one still open)
  const nextLock = events
    .map((event) => event.lockAt)
    .filter((lockAt) => new Date(lockAt).getTime() > now)
    .sort()[0];

  const matchRows = events.map((event) => {
    const prediction = predictions.find((item) => item.event === event._id);

    return (
      <MatchRow
        key={event._id}
        event={event}
        prediction={prediction}
        now={now}
        seasonOver={seasonOver}
        onPress={() => {
          if (event.sport === "football") {
            navigation.navigate("FootballPrediction", { gridId, event, prediction, leagueId });
          } else if (OVER_UNDER_SPORTS.includes(event.sport)) {
            navigation.navigate("OverUnderPrediction", { gridId, event, prediction, leagueId });
          } else if (PODIUM_SPORTS.includes(event.sport)) {
            navigation.navigate("PodiumPrediction", { gridId, event, prediction, leagueId });
          }
        }}
      />
    );
  });

  return (
    <>
      {/* Private leagues: which week of the season, and the end of season (podium, restart) */}
      {leagueId && <SeasonBanner leagueId={leagueId} onRestart={() => setReload(reload + 1)} />}

      <Text style={styles.sectionTitle}>Grille de la semaine</Text>
      <Text style={styles.subtitle}>
        {predictions.length} / {events.length} pronostics · {weekPoints} pts cette semaine
      </Text>
      <View style={styles.progress}>
        <ProgressBar value={predictions.length} max={events.length} />
      </View>

      {canPick && leagueId && (
        <TouchableOpacity
          style={styles.pickButton}
          onPress={() => navigation.navigate("Picks", { leagueId, leagueName })}
        >
          <Ionicons name="options-outline" size={18} color={colors.gold} />
          <Text style={styles.pickButtonText}>CHOISIR LES MATCHS</Text>
        </TouchableOpacity>
      )}

      {nextLock && <Countdown lockAt={nextLock} />}

      {hasResults && (
        <TouchableOpacity
          style={styles.resultsButton}
          onPress={() => navigation.navigate("Result", { gridId, leagueId, leagueName })}
        >
          <Ionicons name="stats-chart" size={18} color={colors.bg} />
          <Text style={styles.resultsButtonText}>VOIR MES RÉSULTATS</Text>
        </TouchableOpacity>
      )}

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {/* No automatic grid: until the matches are picked, there's nothing to predict */}
      {gridId !== "" && events.length === 0 && (
        <Text style={styles.empty}>Les matchs de la semaine n&apos;ont pas encore été choisis. Reviens bientôt !</Text>
      )}

      {matchRows}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
    marginBottom: 10,
  },
  progress: {
    marginBottom: 16,
  },
  resultsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  resultsButtonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "900",
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  pickButtonText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
  },
});
