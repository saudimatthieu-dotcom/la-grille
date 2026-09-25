import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";

import type { RootState } from "../App";
import { colors } from "../config/theme";

type League = {
    _id: string;
    name: string;
    code: string;
    gridType: string;
    members: { user: string; points: number }[];
};

export default function LeaguesListScreen() {
    const token = useSelector((state: RootState) => state.user.value.token);
    const [leagues, setLeagues] = useState<League[]>([]);

    useEffect(() => {
        fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/user/${token}`)
        .then((response) => response.json())
        .then((data) =>{
            if(data.result) {
                setLeagues(data.leagues);
            }
        });
    }, []);

    const leagueCards = leagues.map((league) => (
        <View key={league._id} style={styles.card}>
            <Text style={styles.cardTitle}>{league.name}</Text>
            <Text style={styles.cardInfo}>
                {league.members.length} membres · code {league.code}
            </Text>
        </View>
    ));
    return(
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Mes ligues</Text>
            {leagues.length === 0 ? (
                <Text style={styles.empty}>Tu n'as encore aucune ligue.</Text>
            ) : (
                leagueCards
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
    padding: 24,
    paddingTop: 64,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 24,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  cardInfo: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
  },
});