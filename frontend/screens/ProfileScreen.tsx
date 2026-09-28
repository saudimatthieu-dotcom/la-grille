import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { colors } from "../config/theme";
import { AVATARS } from "../config/avatars";
import Avatar from "../components/Avatar";
import { login, logout } from "../reducers/user";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Profil">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.value);

  const [username, setUsername] = useState(user.username ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Saves a new username and/or avatar, then updates Redux so every screen shows it
  const save = (changes: { username?: string; avatar?: string }) => {
    setMessage("");
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: user.token, ...changes }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          dispatch(login({ token: user.token as string, ...data.user }));
          setMessage("Profil mis à jour ✓");
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigation.navigate("Welcome");
  };

  const avatarChoices = AVATARS.map((avatar) => (
    <TouchableOpacity
      key={avatar}
      style={[styles.avatarChoice, user.avatar === avatar && styles.avatarSelected]}
      onPress={() => save({ avatar })}
    >
      <Text style={styles.avatarEmoji}>{avatar}</Text>
    </TouchableOpacity>
  ));

  const inventory = user.inventory;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>PROFIL</Text>

      <View style={styles.identity}>
        <Avatar avatar={user.avatar} username={user.username} size={84} />
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Text style={styles.section}>Mon avatar</Text>
      <View style={styles.avatarGrid}>{avatarChoices}</View>

      <Text style={styles.section}>Mon pseudo</Text>
      <View style={styles.usernameRow}>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          maxLength={20}
          placeholder="Pseudo"
          placeholderTextColor={colors.muted}
        />
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => save({ username })}
          disabled={username.trim() === "" || username === user.username}
        >
          <Text style={styles.saveText}>OK</Text>
        </TouchableOpacity>
      </View>

      {message !== "" && <Text style={styles.message}>{message}</Text>}
      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.section}>Mes bonus</Text>
      <Text style={styles.inventory}>
        ⚡ {inventory?.doubleur ?? 0} Doubleur · ☂️ {inventory?.assurance ?? 0} Assurance · 🛡️ {inventory?.bouclier ?? 0}{" "}
        Bouclier
      </Text>
      <Text style={styles.hint}>1 Doubleur offert chaque lundi.</Text>

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
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 20,
  },
  identity: {
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  username: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  email: {
    color: colors.muted,
    fontSize: 14,
  },
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 8,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  avatarChoice: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSelected: {
    borderColor: colors.accent,
    borderWidth: 2.5,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  usernameRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  saveText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "900",
  },
  message: {
    color: colors.accent,
    fontSize: 14,
    marginBottom: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: 8,
  },
  inventory: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  logout: {
    alignSelf: "center",
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 32,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },
});
