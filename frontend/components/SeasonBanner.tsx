import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSelector } from "react-redux";

import type { RootState } from "../App";
import { colors } from "../config/theme";
import { DEFAULT_SEASON_WEEKS, MAX_SEASON_WEEKS, MIN_SEASON_WEEKS } from "../config/vip";
import type { SeasonInfo } from "../types";

type Props = {
  leagueId: string;
  // Called when the creator starts the next season: the grid reloads, its matches open again
  onRestart?: () => void;
};

const MEDALS = ["🥇", "🥈", "🥉"];

// "13 décembre": the season's last day (the Sunday before it ends)
function lastDay(endsAt: string) {
  return new Date(new Date(endsAt).getTime() - 1).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

// A private league's season: "Saison 2 · semaine 3/10", and once it's over, its podium and the creator's restart button
export default function SeasonBanner({ leagueId, onRestart }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);
  const isFocused = useIsFocused();

  // null: the public league (no season) or still loading
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [weeks, setWeeks] = useState(String(DEFAULT_SEASON_WEEKS));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/${leagueId}/season/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setSeason(data.season);
          if (data.season) {
            setWeeks(String(data.season.weeks));
          }
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [isFocused, leagueId, token]);

  const handleRestart = () => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/${leagueId}/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Only a VIP creator's length is used: the server gives 10 weeks to the others
      body: JSON.stringify({ token, seasonWeeks: season?.canChooseLength ? Number(weeks) : undefined }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setSeason(data.season);
          onRestart?.();
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  if (!season) {
    return null;
  }

  // During the season: one discreet line
  if (season.state === "running") {
    return (
      <Text style={styles.line}>
        Saison {season.number} · semaine {season.weekIndex}/{season.weeks}
        {season.endsAt ? ` · jusqu'au ${lastDay(season.endsAt)}` : ""}
      </Text>
    );
  }

  const podium = season.lastPodium.map((row) => (
    <Text key={row.user} style={styles.podiumRow}>
      {MEDALS[row.rank - 1] ?? ""} {row.username} · {row.points} pts
    </Text>
  ));

  return (
    <View style={styles.box}>
      <Text style={styles.title}>🏁 Saison {season.number} terminée</Text>

      {season.state === "ending" && (
        <Text style={styles.text}>Les derniers matchs sont en cours de calcul : le classement final arrive bientôt.</Text>
      )}

      {season.state === "finished" && (
        <>
          {podium.length > 0 ? podium : <Text style={styles.text}>Personne n&apos;a marqué de points.</Text>}

          {season.isOwner ? (
            <>
              {season.canChooseLength && (
                <View style={styles.weeksRow}>
                  <Text style={styles.text}>Durée de la prochaine saison (VIP)</Text>
                  <TextInput
                    style={styles.weeksInput}
                    value={weeks}
                    onChangeText={(text) => setWeeks(text.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.text}>sem.</Text>
                </View>
              )}
              {season.canChooseLength && (
                <Text style={styles.hint}>
                  De {MIN_SEASON_WEEKS} à {MAX_SEASON_WEEKS} semaines.
                </Text>
              )}

              <TouchableOpacity style={styles.button} onPress={handleRestart}>
                <Text style={styles.buttonText}>LANCER LA SAISON {season.number + 1}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.text}>En attente du créateur de la ligue pour lancer la saison suivante.</Text>
          )}
        </>
      )}

      {error !== "" && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
  },
  box: {
    backgroundColor: colors.card,
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 6,
  },
  title: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "900",
  },
  text: {
    color: colors.muted,
    fontSize: 14,
  },
  podiumRow: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  weeksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  weeksInput: {
    width: 56,
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "900",
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
