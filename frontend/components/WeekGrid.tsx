import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { SPORT_ICONS } from "../config/sports";
import { BONUSES } from "../config/bonuses";
import Countdown from "./Countdown";
import ProgressBar from "./ProgressBar";
import SeasonBanner from "./SeasonBanner";
import type { Prediction, SportEvent } from "../types";
import { eventTitle, formatDay, formatResult, formatTime } from "../utils/format";

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
    const query = leagueId ? `?leagueId=${leagueId}` : "";

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/grids/current/${token}${query}`)
      .then((response) => response.json())
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
        return fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/predictions/grid/${data.grid._id}/${token}${query}`)
          .then((response) => response.json())
          .then((predictionData) => {
            if (predictionData.result) {
              setPredictions(predictionData.predictions);
            }
          });
      })
      .catch(() => setError("Impossible to connect to server"));
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
    const isFinished = event.status === "finished";
    const isLocked = !isFinished && new Date(event.lockAt).getTime() <= now;
    // The bonus I played on this match here, if any: its icon sits next to the status
    const bonusIcon = BONUSES.find((item) => item.kind === prediction?.bonus)?.icon;

    let status = (
      <Ionicons
        name={prediction ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={prediction ? colors.accent : colors.muted}
      />
    );

    if (isFinished) {
      status = (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{formatResult(event)}</Text>
          <Text style={styles.points}>{prediction?.points != null ? `+${prediction.points} pts` : "—"}</Text>
        </View>
      );
    } else if (isLocked) {
      status = <Ionicons name="lock-closed" size={20} color={colors.muted} />;
    }

    return (
      <TouchableOpacity
        key={event._id}
        style={[styles.row, (isLocked || seasonOver) && styles.rowLocked]}
        disabled={isFinished || isLocked || seasonOver}
        onPress={() => {
          if (event.sport === "football") {
            navigation.navigate("FootballPrediction", { gridId, event, prediction, leagueId });
          } else if (event.sport === "basket" || event.sport === "rugby") {
            navigation.navigate("OverUnderPrediction", { gridId, event, prediction, leagueId });
          } else if (event.sport === "f1" || event.sport === "tennis") {
            navigation.navigate("PodiumPrediction", { gridId, event, prediction, leagueId });
          }
        }}
      >
        {/* Kick-off first, like a fixture list: "20:45" over "ven. 2 oct." */}
        <View style={styles.kickoff}>
          {/* numberOfLines + adjustsFontSizeToFit: always one line, the text shrinks a little if needed */}
          <Text style={styles.kickoffTime} numberOfLines={1} adjustsFontSizeToFit>
            {formatTime(event.startsAt)}
          </Text>
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
        {bonusIcon && <Ionicons name={bonusIcon} size={18} color={colors.accent} />}
        {status}
      </TouchableOpacity>
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
  rowLocked: {
    opacity: 0.6,
  },
  kickoff: {
    width: 84,
    alignItems: "center",
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  kickoffTime: {
    color: colors.text,
    fontSize: 17,
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
  rowInfoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  rowInfo: {
    color: colors.muted,
    fontSize: 13,
  },
  resultBox: {
    alignItems: "flex-end",
    maxWidth: 140,
  },
  resultText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  points: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
});
