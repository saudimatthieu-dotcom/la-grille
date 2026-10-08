import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";
import { GRID_TYPES } from "../config/gridTypes";
import { DEFAULT_SEASON_WEEKS, FREE_LEAGUE_MAX_MEMBERS, MAX_SEASON_WEEKS, MIN_SEASON_WEEKS } from "../config/vip";
import { useMe } from "../utils/useMe";

type Props = NativeStackScreenProps<RootStackParamList, "CreateLeague">;

export default function CreateLeagueScreen({ navigation }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);
  // VIP: the sur-mesure grid and leagues with no player limit
  const me = useMe();
  const isVip = Boolean(me?.isVip);

  const [name, setName] = useState("");
  const [gridType, setGridType] = useState("officielle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  // Season length in weeks: only a VIP creator changes it (the server gives 10 to the others)
  const [seasonWeeks, setSeasonWeeks] = useState(String(DEFAULT_SEASON_WEEKS));

  const handleCreate = () => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, gridType, seasonWeeks: isVip ? Number(seasonWeeks) : undefined }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          navigation.goBack();
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const handleJoin = () => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/leagues/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, code }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          navigation.goBack();
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const gridTypeOptions = GRID_TYPES.map((type) => {
    const isSelected = gridType === type.value;
    // A VIP option for a player who isn't VIP: tapping it shows the pass instead
    const isLocked = type.premium && !isVip;

    return (
      <TouchableOpacity
        key={type.value}
        style={[styles.option, isSelected && styles.optionSelected, isLocked && styles.optionLocked]}
        onPress={() => (isLocked ? navigation.navigate("Vip") : setGridType(type.value))}
      >
        <Ionicons
          name={type.premium && isVip ? "options-outline" : type.icon}
          size={26}
          color={isSelected ? colors.accent : isLocked ? colors.muted : colors.text}
        />

        <View style={styles.optionBody}>
          <Text style={styles.optionTitle}>{type.label}</Text>
          <Text style={styles.optionDescription}>{type.description}</Text>
        </View>

        {isLocked ? (
          <Text style={styles.premium}>VIP</Text>
        ) : (
          <Ionicons
            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={isSelected ? colors.accent : colors.muted}
          />
        )}
      </TouchableOpacity>
    );
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>CRÉER UNE LIGUE</Text>
      </View>

      <Text style={styles.label}>Rejoins une ligue avec un code</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex : P8JS?T"
        placeholderTextColor={colors.muted}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />

      <TouchableOpacity style={styles.button} onPress={handleJoin}>
        <Text style={styles.buttonText}>REJOINDRE</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Ou crée ta ligue : nom de la ligue</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex : Les copains"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Choisis ton type de grille</Text>
      {gridTypeOptions}

      <Text style={styles.label}>Durée d&apos;une saison</Text>
      {isVip ? (
        <View style={styles.weeksRow}>
          <TextInput
            style={styles.weeksInput}
            value={seasonWeeks}
            onChangeText={(text) => setSeasonWeeks(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.weeksText}>
            semaines 👑 (de {MIN_SEASON_WEEKS} à {MAX_SEASON_WEEKS})
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          {DEFAULT_SEASON_WEEKS} semaines, puis le classement repart à 0 (durée au choix avec le Pass VIP).
        </Text>
      )}

      <Text style={styles.hint}>
        {isVip
          ? "👑 VIP : ta ligue n'a pas de limite de joueurs."
          : `Jusqu'à ${FREE_LEAGUE_MAX_MEMBERS} joueurs par ligue (illimité avec le Pass VIP).`}
      </Text>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleCreate}>
        <Text style={styles.buttonText}>CRÉER LA LIGUE</Text>
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
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    marginBottom: 28,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: colors.accent,
  },
  optionLocked: {
    opacity: 0.5,
  },
  optionBody: {
    flex: 1,
    marginLeft: 14,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  optionDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  weeksRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  weeksInput: {
    width: 64,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    borderRadius: 12,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  weeksText: {
    color: colors.text,
    fontSize: 14,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  premium: {
    backgroundColor: colors.gold,
    color: colors.bg,
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 6,
    overflow: "hidden",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  error: {
    color: colors.danger,
    marginTop: 8,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "900",
  },
});
