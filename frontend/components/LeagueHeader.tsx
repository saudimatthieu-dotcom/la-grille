import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { ordinal } from "../utils/format";

type Tab = "League" | "Ranking" | "Chat";

type Props = {
  leagueId: string;
  leagueName: string;
  active: Tab;
};

const TABS: { name: Tab; label: string }[] = [
  { name: "League", label: "Grille" },
  { name: "Ranking", label: "Classement" },
  { name: "Chat", label: "Chat" },
];

// The top of a league: name, my rank, points this week, and the Grille / Classement / Chat tabs
export default function LeagueHeader({ leagueId, leagueName, active }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const token = useSelector((state: RootState) => state.user.value.token);
  const username = useSelector((state: RootState) => state.user.value.username);

  const [stats, setStats] = useState<{ rank: number; total: number; weekPoints: number } | null>(null);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/${leagueId}/ranking/${token}?scope=season`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.result) {
          return;
        }
        const me = data.ranking.find((row: { username: string }) => row.username === username);
        if (me) {
          setStats({ rank: me.rank, total: data.ranking.length, weekPoints: me.weekPoints });
        }
      })
      .catch(() => {});
  }, [leagueId, token, username]);

  const tabs = TABS.map((tab) => {
    const isActive = tab.name === active;

    return (
      <TouchableOpacity
        key={tab.name}
        style={[styles.tab, isActive && styles.tabActive]}
        // replace (not navigate): switching tabs doesn't pile screens up behind the back arrow
        onPress={() => !isActive && navigation.replace(tab.name, { leagueId, leagueName })}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleBody}>
          <Text style={styles.title} numberOfLines={1}>
            {leagueName.toUpperCase()}
          </Text>
          {stats && (
            <Text style={styles.rank}>
              {ordinal(stats.rank)} / {stats.total}
            </Text>
          )}
        </View>
        {stats && stats.weekPoints > 0 && (
          <View style={styles.weekBadge}>
            <Text style={styles.weekText}>+{stats.weekPoints} cette semaine</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>{tabs}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  titleBody: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  rank: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  weekBadge: {
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weekText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  tabTextActive: {
    color: colors.bg,
  },
});
