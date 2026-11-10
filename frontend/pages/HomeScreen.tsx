import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import { useIsFocused } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { colors } from "../config/theme";
import { splitTacticText } from "../config/bonuses";
import Avatar from "../components/Avatar";
import ActionRequired from "../components/ActionRequired";
import HomeLeagueCard, { type MyLeague } from "../components/HomeLeagueCard";
import TacticIcon from "../components/TacticIcon";
import AdBanner from "../components/AdBanner";
import { registerPush } from "../utils/registerPush";
import { loadMyLeagues } from "../data/leagues";
import { loadLatestMessages } from "../data/messages";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Accueil">,
  NativeStackScreenProps<RootStackParamList>
>;

type Latest = { text: string; leagueId: string; leagueName: string } | null;

export default function HomeScreen({ navigation }: Props) {
  const user = useSelector((state: RootState) => state.user.value);

  const [leagues, setLeagues] = useState<MyLeague[]>([]);
  const [latest, setLatest] = useState<Latest>(null);
  const isFocused = useIsFocused();

  // Saves this phone's push token once per sign-in (not on every focus like the effect below)
  useEffect(() => {
    if (user.token) {
      registerPush(user.token);
    }
  }, [user.token]);

  // Reloads my leagues and the latest news every time I come back to this tab
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    loadMyLeagues(user.token)
      .then((data) => {
        if (data.result) {
          setLeagues(data.leagues);
        }
      })
      .catch(() => {});

    loadLatestMessages(user.token)
      .then((data) => {
        if (data.result) {
          setLatest(data.latest);
        }
      })
      .catch(() => {});
  }, [isFocused, user.token]);

  // A grid is "to complete" while I haven't predicted every match (or haven't opened it yet)
  const toComplete = leagues.filter((league) => league.total === null || league.filled < league.total).length;

  const leagueCards = leagues.map((league) => (
    <HomeLeagueCard
      key={league._id}
      league={league}
      onPress={() => navigation.navigate("League", { leagueId: league._id, leagueName: league.name })}
    />
  ));

  // The latest news, its emoji split off (a bonus or a sabotage gets its neon icon)
  const news = latest ? splitTacticText(latest.text) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.logo}>LA GRILLE</Text>
          {/* My avatar right after my name (a tap opens my profile); a long username shrinks a little instead of wrapping */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              Bonjour {user.username}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Profil")}>
              <Avatar avatar={user.avatar} username={user.username} size={34} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Prêt à faire chauffer la grille ?</Text>
        </View>
        {/* The same mascot as the welcome screen */}
        <Image source={require("../assets/logo.png")} style={styles.mascot} resizeMode="contain" />
      </View>

      {toComplete > 0 && <ActionRequired count={toComplete} onPress={() => navigation.navigate("Grille")} />}

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
          onPress={() => navigation.navigate("League", { leagueId: latest.leagueId, leagueName: latest.leagueName, tab: "chat" })}
        >
          {/* A bonus or a sabotage: its neon icon in place of the emoji */}
          {news?.kind && <TacticIcon kind={news.kind} size={36} />}
          <Text style={styles.newsText} numberOfLines={2}>
            {news?.text}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
      )}

      <AdBanner />
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
  // logo.png is 600 × 708: same proportions
  mascot: {
    width: 90,
    height: 106,
    marginLeft: 8,
  },
  logo: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
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
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
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
