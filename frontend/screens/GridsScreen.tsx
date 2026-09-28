import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import { useIsFocused } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { colors } from "../config/theme";
import ProgressBar from "../components/ProgressBar";
import { formatDate } from "../utils/format";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Grille">,
  NativeStackScreenProps<RootStackParamList>
>;

type MyGrid = {
  leagueId: string;
  leagueName: string;
  grid: { _id: string; total: number; filled: number; open: number; nextLockAt: string | null } | null;
};

// All my grids of the week, one per league — the fastest way to see what's left to predict
export default function GridsScreen({ navigation }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  const [grids, setGrids] = useState<MyGrid[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/grids/mine/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setGrids(data.grids);
        } else {
          setError(data.error);
        }
        setIsLoaded(true);
      })
      .catch(() => setError("Impossible to connect to server"));
  }, [isFocused, token]);

  const cards = grids.map((item) => {
    const grid = item.grid;
    const isComplete = grid !== null && grid.filled >= grid.total;
    const isClosed = grid !== null && grid.open === 0;

    let status = "Pas encore de matchs";
    if (grid && isClosed) {
      status = "Grille fermée";
    } else if (grid && grid.nextLockAt) {
      status = `Prochaine fermeture : ${formatDate(grid.nextLockAt)}`;
    }

    return (
      <TouchableOpacity
        key={item.leagueId}
        style={[styles.card, grid && !isComplete && !isClosed && styles.cardTodo]}
        onPress={() => navigation.navigate("League", { leagueId: item.leagueId, leagueName: item.leagueName })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.leagueName}</Text>
          {grid && (
            <Ionicons
              name={isComplete ? "checkmark-circle" : "alert-circle"}
              size={22}
              color={isComplete ? colors.accent : isClosed ? colors.muted : colors.danger}
            />
          )}
        </View>

        {grid && (
          <>
            <Text style={styles.count}>
              {grid.filled} / {grid.total} pronostics
            </Text>
            <ProgressBar value={grid.filled} max={grid.total} />
          </>
        )}

        <Text style={styles.status}>{status}</Text>
      </TouchableOpacity>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>MES GRILLES</Text>
      <Text style={styles.subtitle}>Les grilles de la semaine de toutes tes ligues</Text>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {isLoaded && grids.length === 0 && (
        <Text style={styles.empty}>Rejoins une ligue pour recevoir ta première grille.</Text>
      )}

      {cards}
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
  title: {
    color: colors.text,
    fontSize: 26,
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
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardTodo: {
    borderColor: colors.accent,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  count: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  status: {
    color: colors.muted,
    fontSize: 13,
  },
});
