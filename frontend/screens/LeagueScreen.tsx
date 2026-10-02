import { ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { colors } from "../config/theme";
import LeagueHeader from "../components/LeagueHeader";
import WeekGrid from "../components/WeekGrid";

type Props = NativeStackScreenProps<RootStackParamList, "League">;

// A league's Grille tab: the same grid as everyone, with the league's header on top
export default function LeagueScreen({ route }: Props) {
  const { leagueId, leagueName } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LeagueHeader leagueId={leagueId} leagueName={leagueName} active="League" />
      <WeekGrid leagueId={leagueId} leagueName={leagueName} />
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
});
