import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import { useIsFocused } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { logout, updateInventory } from "../reducers/user";
import { colors } from "../config/theme";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Accueil">,
  NativeStackScreenProps<RootStackParamList>
>;

type MyLeague = {
  _id: string;
  name: string;
  members: { user: string }[];
  myPoints: number;
  myRank: number;
};

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.value);

  const [leagues, setLeagues] = useState<MyLeague[]>([]);
  const isFocused = useIsFocused();

  // Reloads my leagues and my inventory every time I come back to this tab
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/user/${user.token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setLeagues(data.leagues);
        }
      })
      .catch(() => {});

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/me/${user.token}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          dispatch(updateInventory(data.user.inventory));
        }
      })
      .catch(() => {});
  }, [isFocused, user.token, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigation.navigate("Welcome");
  };

  const inventory = user.inventory;

  const inventoryItems = [
    { label: "Doubleur", value: inventory?.doubleur ?? 0, icon: <Ionicons name="flash-outline" size={22} color={colors.accent} /> },
    { label: "Assurance", value: inventory?.assurance ?? 0, icon: <Ionicons name="umbrella-outline" size={22} color={colors.accent} /> },
    { label: "Bouclier", value: inventory?.bouclier ?? 0, icon: <Ionicons name="shield-outline" size={22} color={colors.accent} /> },
  ].map((item) => (
    <View key={item.label} style={styles.tile}>
      {item.icon}
      <Text style={styles.tileValue}>{item.value}</Text>
      <Text style={styles.tileLabel}>{item.label}</Text>
    </View>
  ));

  const leagueCards = leagues.map((league) => (
    <TouchableOpacity
      key={league._id}
      style={styles.card}
      onPress={() => navigation.navigate("League", { leagueId: league._id, leagueName: league.name })}
    >
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{league.name}</Text>
        <Text style={styles.cardInfo}>
          {league.myRank === 1 && league.myPoints > 0 ? "👑 " : ""}
          {league.myRank}e sur {league.members.length} · {league.myPoints} pts
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </TouchableOpacity>
  ));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Salut {user.username} 👋</Text>

      <Text style={styles.section}>Mes bonus</Text>
      <View style={styles.tiles}>{inventoryItems}</View>

      <Text style={styles.section}>Mes ligues</Text>
      {leagues.length === 0 ? (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("CreateLeague")}>
          <MaterialCommunityIcons name="trophy-outline" size={24} color={colors.accent} />
          <Text style={styles.cardTitle}>Crée ou rejoins ta première ligue</Text>
        </TouchableOpacity>
      ) : (
        leagueCards
      )}

      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
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
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 24,
  },
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  tiles: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  tileValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  cardInfo: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  logout: {
    alignSelf: "center",
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 28,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },
});
