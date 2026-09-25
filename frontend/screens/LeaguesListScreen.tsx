import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { useIsFocused } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { colors } from "../config/theme";
import { GRID_TYPES } from "../config/gridTypes";

type League = {
  _id: string;
  name: string;
  code: string;
  gridType: string;
  members: { user: string; points: number }[];
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Ligues">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function LeaguesListScreen({ navigation }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);
  const [leagues, setLeagues] = useState<League[]>([]);

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/user/${token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLeagues(data.leagues);
        }
      });
  }, [isFocused]);

  const leagueCards = leagues.map((league) => {
    const gridType = GRID_TYPES.find((type) => type.value === league.gridType);

    return (
      <View key={league._id} style={styles.card}>
        <View style={styles.cardIcon}>
          <Ionicons name={gridType?.icon ?? "trophy-outline"} size={26} color={colors.accent} />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{league.name}</Text>
          <Text style={styles.cardType}>Grille {gridType?.label.toLowerCase()}</Text>
          <Text style={styles.cardInfo}>
            {league.members.length} membres · code {league.code}
          </Text>
        </View>
      </View>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>MES LIGUES</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("CreateLeague")}>
          <Ionicons name="add" size={26} color={colors.bg} />
        </TouchableOpacity>
      </View>

      {leagues.length === 0 ? (
        <Text style={styles.empty}>Tu n'as encore aucune ligue.</Text>
      ) : (
        leagueCards
      )}

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("CreateLeague")}>
        <Ionicons name="add" size={20} color={colors.accent} />
        <Text style={styles.buttonText}>CRÉER OU REJOINDRE UNE LIGUE</Text>
      </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  addButton: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderColor: colors.accent,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  cardType: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  cardInfo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 12,
  },
  buttonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900",
  },
});
