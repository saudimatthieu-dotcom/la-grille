import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { formatWeek } from "../utils/format";
import { loadRanking } from "../data/leagues";

type Props = {
  leagueId: string;
  leagueName: string;
};

type LastGrid = {
  gridId: string;
  season: number;
  week: number;
};

// "Ma dernière grille": a shortcut to the results of the week before — it used to take 5 taps
// (Classement → Semaine → the previous week → Voir ma grille). Hidden while there is no past grid
export default function LastGridButton({ leagueId, leagueName }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useSelector((state: RootState) => state.user.value.token);

  const [lastGrid, setLastGrid] = useState<LastGrid | null>(null);

  useEffect(() => {
    // Two calls: this week's answer says which week came before, and that week's answer holds its grid id
    loadRanking(leagueId, token, "week")
      .then((data) => {
        if (!data.result || !data.previous) {
          return null;
        }

        return loadRanking(leagueId, token, "week", data.previous);
      })
      .then((data) => {
        if (data?.result && data.gridId) {
          setLastGrid({ gridId: data.gridId, season: data.season, week: data.week });
        }
      })
      .catch(() => {});
  }, [leagueId, token]);

  if (!lastGrid) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate("Result", { gridId: lastGrid.gridId, leagueId, leagueName })}
      activeOpacity={0.8}
    >
      <Ionicons name="trophy-outline" size={20} color={colors.accent} />
      <Text style={styles.text}>MA DERNIÈRE GRILLE</Text>
      <Text style={styles.week}>{formatWeek(lastGrid.season, lastGrid.week)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  text: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  week: {
    color: colors.muted,
    fontSize: 13,
  },
});
