import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList } from "../App";
import { colors } from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Admin">;

// One player of the search, as GET /admin/users sends it
type Player = {
  _id: string;
  username: string;
  email: string;
  isVip: boolean;
  vipUntil: string | null;
};

// "8 nov. 2026"
function formatFullDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// For the admin accounts: pick the grids' matches, and hand out the VIP pass (until in-app payment exists)
export default function AdminScreen({ navigation }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  // The month's import takes 1 to 2 minutes: the button waits and then says how many matches came in
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  // Imports every match of the coming month from the sports APIs
  const handleImport = () => {
    setIsImporting(true);
    setImportMessage("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/admin/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => response.json())
      .then((data) => {
        setImportMessage(data.result ? `${data.imported} matchs importés pour les ${data.days} prochains jours ✓` : data.error);
      })
      .catch(() => setImportMessage("Impossible to connect to server"))
      .finally(() => setIsImporting(false));
  };

  // Searches as the admin types — from 2 letters, on the username or the email
  const handleSearch = (text: string) => {
    setSearch(text);
    setError("");

    if (text.trim().length < 2) {
      setPlayers([]);
      return;
    }

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/admin/users/${token}?search=${encodeURIComponent(text.trim())}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setPlayers(data.users);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  // months: added to what's left of the pass — 0 takes it away
  const giveVip = (userId: string, months: number) => {
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/admin/vip`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId, months }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setPlayers(players.map((player) => (player._id === userId ? data.user : player)));
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible to connect to server"));
  };

  const playerRows = players.map((player) => (
    <View key={player._id} style={styles.player}>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.username}</Text>
        <Text style={styles.muted}>{player.email}</Text>
        <Text style={[styles.status, player.isVip && styles.statusVip]}>
          {player.isVip && player.vipUntil ? `VIP jusqu'au ${formatFullDate(player.vipUntil)}` : "Pas VIP"}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.smallButton} onPress={() => giveVip(player._id, 1)}>
          <Text style={styles.smallButtonText}>+1 mois</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={() => giveVip(player._id, 12)}>
          <Text style={styles.smallButtonText}>+1 an</Text>
        </TouchableOpacity>
        {player.isVip && (
          <TouchableOpacity style={styles.removeButton} onPress={() => giveVip(player._id, 0)}>
            <Text style={styles.removeText}>Retirer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>ADMINISTRATION</Text>
      </View>

      <Text style={styles.section}>Matchs</Text>
      <TouchableOpacity
        style={[styles.importButton, isImporting && styles.buttonDisabled]}
        onPress={handleImport}
        disabled={isImporting}
      >
        <Ionicons name="cloud-download-outline" size={20} color={colors.accent} />
        <Text style={styles.importText}>{isImporting ? "IMPORT EN COURS… (1 À 2 MIN)" : "IMPORTER LES MATCHS DU MOIS"}</Text>
      </TouchableOpacity>
      {importMessage !== "" && <Text style={styles.importMessage}>{importMessage}</Text>}
      <Text style={styles.hint}>
        Foot, rugby, basket et F1 des 31 prochains jours (5 matchs par journée de championnat, les week-ends pour la
        NBA). À relancer quand tu veux : les matchs déjà importés sont mis à jour, pas dupliqués.
      </Text>

      <Text style={styles.section}>Grilles</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Picks", {})}>
        <Ionicons name="grid-outline" size={20} color={colors.bg} />
        <Text style={styles.buttonText}>CHOISIR LES MATCHS DES GRILLES</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Officielle, Classique, Exotique : coche les matchs de chaque semaine. Rien n&apos;est automatique : sans choix,
        la grille de la semaine reste vide.
      </Text>

      <Text style={styles.section}>Pass VIP</Text>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={handleSearch}
        autoCapitalize="none"
        placeholder="Pseudo ou email du joueur"
        placeholderTextColor={colors.muted}
      />

      {error !== "" && <Text style={styles.error}>{error}</Text>}
      {search.trim().length >= 2 && players.length === 0 && error === "" && (
        <Text style={styles.muted}>Aucun joueur trouvé.</Text>
      )}

      {playerRows}
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
    gap: 8,
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: "900",
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
  },
  importText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "900",
  },
  importMessage: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 10,
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
  },
  player: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  playerInfo: {
    gap: 2,
  },
  playerName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  status: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  statusVip: {
    color: colors.gold,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  smallButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: "800",
  },
  removeButton: {
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
  },
});
