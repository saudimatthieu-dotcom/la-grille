import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import { useIsFocused } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { updateInventory } from "../reducers/user";
import { colors } from "../config/theme";
import { GRID_TYPES } from "../config/gridTypes";
import Avatar from "../components/Avatar";
import ProgressBar from "../components/ProgressBar";
import { ordinal } from "../utils/format";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Accueil">,
  NativeStackScreenProps<RootStackParamList>
>;

type MyLeague = {
  _id: string;
  name: string;
  gridType: string;
  members: { user: string }[];
  myPoints: number;
  myRank: number;
  filled: number;
  total: number | null;
};

type Latest = { text: string; leagueId: string; leagueName: string } | null;

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.value);

  const [leagues, setLeagues] = useState<MyLeague[]>([]);
  const [latest, setLatest] = useState<Latest>(null);
  const isFocused = useIsFocused();

  // Reloads my leagues, my inventory and the latest news every time I come back to this tab
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const url = process.env.EXPO_PUBLIC_BACKEND_ADRESS;

    fetch(`${url}/leagues/user/${user.token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLeagues(data.leagues);
        }
      })
      .catch(() => {});

    fetch(`${url}/users/me/${user.token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          dispatch(updateInventory(data.user.inventory));
        }
      })
      .catch(() => {});

    fetch(`${url}/messages/latest/${user.token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLatest(data.latest);
        }
      })
      .catch(() => {});
  }, [isFocused, user.token, dispatch]);

  // A grid is "to complete" while I haven't predicted every match (or haven't opened it yet)
  const toComplete = leagues.filter((league) => league.total === null || league.filled < league.total).length;

  const leagueCards = leagues.map((league) => {
    const gridType = GRID_TYPES.find((type) => type.value === league.gridType);
    const isComplete = league.total !== null && league.filled >= league.total;

    return (
      <TouchableOpacity
        key={league._id}
        style={styles.card}
        onPress={() => navigation.navigate("League", { leagueId: league._id, leagueName: league.name })}
      >
        <View style={styles.cardIcon}>
          <Ionicons name={gridType?.icon ?? "trophy-outline"} size={24} color={colors.accent} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{league.name}</Text>
            <View style={[styles.dot, { backgroundColor: isComplete ? colors.accent : colors.danger }]} />
          </View>
          <Text style={styles.cardType}>Grille {gridType?.label.toLowerCase()}</Text>
          <Text style={styles.cardInfo}>
            {league.myRank === 1 && league.myPoints > 0 ? "👑 " : ""}
            {ordinal(league.myRank)} / {league.members.length} · {league.myPoints} pts
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <ProgressBar value={league.filled} max={league.total ?? 10} />
            </View>
            <Text style={styles.progressText}>
              {league.filled}/{league.total ?? 10}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.logo}>LA GRILLE</Text>
          <Text style={styles.title}>Bonjour {user.username} 👋</Text>
          <Text style={styles.subtitle}>Prêt à faire chauffer la grille ?</Text>
        </View>
        <Image source={require("../assets/mascot-home.png")} style={styles.mascot} resizeMode="contain" />
        <TouchableOpacity onPress={() => navigation.navigate("Profil")}>
          <Avatar avatar={user.avatar} username={user.username} size={52} />
        </TouchableOpacity>
      </View>

      {toComplete > 0 && (
        <View style={styles.action}>
          <View style={styles.actionTitleRow}>
            <Ionicons name="flash" size={20} color={colors.accent} />
            <Text style={styles.actionLabel}>ACTION REQUISE</Text>
          </View>
          <Text style={styles.actionText}>
            {toComplete} grille{toComplete > 1 ? "s" : ""} à compléter
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("Grille")}>
            <Text style={styles.actionButtonText}>VOIR MES GRILLES →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Mes ligues</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Ligues")}>
          <Text style={styles.seeAll}>Voir tout →</Text>
        </TouchableOpacity>
      </View>

      {leagues.length === 0 ? (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("CreateLeague")}>
          <MaterialCommunityIcons name="trophy-outline" size={24} color={colors.accent} />
          <Text style={styles.cardTitle}>Crée ou rejoins ta première ligue</Text>
        </TouchableOpacity>
      ) : (
        leagueCards
      )}

      {latest && (
        <TouchableOpacity
          style={styles.news}
          onPress={() => navigation.navigate("Chat", { leagueId: latest.leagueId, leagueName: latest.leagueName })}
        >
          <Text style={styles.newsText} numberOfLines={2}>
            {latest.text}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
      )}
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
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  mascot: {
    width: 90,
    height: 117,
    marginRight: 12,
  },
  logo: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  action: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  actionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  actionText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  actionButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: "900",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  seeAll: {
    color: colors.muted,
    fontSize: 13,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderColor: colors.accent,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardType: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 1,
  },
  cardInfo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
  },
  news: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  newsText: {
    flex: 1,
    color: colors.gold,
    fontSize: 14,
    fontWeight: "700",
  },
});
