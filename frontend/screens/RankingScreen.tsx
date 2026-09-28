import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Ranking">;

type Scope = "week" | "season";

type RankingRow = {
  userId: string;
  username: string;
  points: number;
  rank: number;
  isLeader: boolean;
  isLastPlace: boolean;
};

export default function RankingScreen({ navigation, route }: Props) {
  const { leagueId, leagueName } = route.params;
  const token = useSelector((state: RootState) => state.user.value.token);
  const username = useSelector((state: RootState) => state.user.value.username);

  const [scope, setScope] = useState<Scope>("season");
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [error, setError] = useState("");

  // Runs again every time the Semaine / Saison toggle changes
  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/${leagueId}/ranking/${token}?scope=${scope}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setRanking(data.ranking);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [leagueId, token, scope]);

  const rows = ranking.map((row) => {
    const isMe = row.username === username;

    return (
      <View key={row.userId} style={[styles.row, isMe && styles.rowMe, row.isLastPlace && styles.rowLast]}>
        <Text style={styles.rank}>{row.rank}</Text>

        <View style={styles.rowBody}>
          <View style={styles.nameLine}>
            {row.isLeader && <MaterialCommunityIcons name="crown" size={20} color={colors.gold} />}
            <Text style={styles.username}>
              {row.username}
              {isMe ? " (moi)" : ""}
            </Text>
          </View>
          {row.isLastPlace && <Text style={styles.lastBadge}>LANTERNE ROUGE</Text>}
        </View>

        <Text style={styles.points}>{row.points} pts</Text>
      </View>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>CLASSEMENT</Text>
      </View>
      <Text style={styles.subtitle}>{leagueName}</Text>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleButton, scope === "week" && styles.toggleSelected]}
          onPress={() => setScope("week")}
        >
          <Text style={[styles.toggleText, scope === "week" && styles.toggleTextSelected]}>Semaine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, scope === "season" && styles.toggleSelected]}
          onPress={() => setScope("season")}
        >
          <Text style={[styles.toggleText, scope === "season" && styles.toggleTextSelected]}>Saison</Text>
        </TouchableOpacity>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {rows}
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
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleSelected: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  toggleTextSelected: {
    color: colors.bg,
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
  rowMe: {
    borderColor: colors.accent,
  },
  rowLast: {
    borderColor: colors.danger,
  },
  rank: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    width: 28,
    textAlign: "center",
  },
  rowBody: {
    flex: 1,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  lastBadge: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
  },
  points: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "900",
  },
});
