import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { colors } from "../config/theme";
import type { LeagueTab } from "../types";
import LeagueChat from "../components/LeagueChat";
import LeagueHeader from "../components/LeagueHeader";
import LeagueRanking from "../components/LeagueRanking";
import WeekGrid from "../components/WeekGrid";

type Props = NativeStackScreenProps<RootStackParamList, "League">;

// One league: its header stays on top, the Grille / Classement / Chat tabs switch the content below it
export default function LeagueScreen({ route }: Props) {
  const { leagueId, leagueName } = route.params;

  const [tab, setTab] = useState<LeagueTab>(route.params.tab ?? "grid");

  // Coming back here with another tab asked (e.g. "VOIR LE CLASSEMENT" on the results screen)
  useEffect(() => {
    if (route.params.tab) {
      setTab(route.params.tab);
    }
  }, [route.params.tab]);

  return (
    // The whole screen moves up with the keyboard, so the chat's input stays visible
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}>
        <LeagueHeader leagueId={leagueId} leagueName={leagueName} active={tab} onTabChange={setTab} />
      </View>

      {tab === "grid" && (
        <ScrollView contentContainerStyle={styles.content}>
          <WeekGrid leagueId={leagueId} leagueName={leagueName} />
        </ScrollView>
      )}

      {tab === "ranking" && (
        <ScrollView contentContainerStyle={styles.content}>
          <LeagueRanking leagueId={leagueId} leagueName={leagueName} />
        </ScrollView>
      )}

      {/* No ScrollView around the chat: it has its own, with the input fixed at the bottom */}
      {tab === "chat" && <LeagueChat leagueId={leagueId} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
