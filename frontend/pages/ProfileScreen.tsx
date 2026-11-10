import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { colors } from "../config/theme";
import Avatar from "../components/Avatar";
import AvatarPicker from "../components/AvatarPicker";
import BonusInventory from "../components/BonusInventory";
import DeleteAccount from "../components/DeleteAccount";
import NotificationSwitches from "../components/NotificationSwitches";
import { login, logout } from "../reducers/user";
import { useMe } from "../data/useMe";
import { useAdPrivacyOptions } from "../utils/ads";
import { saveProfile } from "../data/users";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Profil">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.value);
  // The VIP and admin status, from the server
  const me = useMe();
  const adPrivacy = useAdPrivacyOptions();

  const [username, setUsername] = useState(user.username ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Saves a new username and/or avatar, then updates Redux so every screen shows it
  const save = (changes: { username?: string; avatar?: string }) => {
    setMessage("");
    setError("");

    saveProfile({ token: user.token, ...changes })
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>PROFIL</Text>

      <View style={styles.identity}>
        <Avatar avatar={user.avatar} username={user.username} size={84} />
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Text style={styles.section}>Mon avatar</Text>
      <AvatarPicker selected={user.avatar} onSelect={(avatar) => save({ avatar })} />

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

      <TouchableOpacity style={styles.statsButton} onPress={() => navigation.navigate("Stats")}>
        <Ionicons name="stats-chart" size={20} color={colors.bg} />
        <Text style={styles.statsText}>MES STATS{me && !me.isVip ? " · VIP" : ""}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.vipButton} onPress={() => navigation.navigate("Vip")}>
        <Text style={styles.vipText}>{me?.isVip ? "👑 TU ES VIP" : "👑 PASS VIP"}</Text>
      </TouchableOpacity>

      {/* Only the admin accounts see it: the grids' matches and the VIP pass */}
      {me?.isAdmin && (
        <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate("Admin")}>
          <Ionicons name="construct-outline" size={20} color={colors.accent} />
          <Text style={styles.adminText}>ADMINISTRATION</Text>
        </TouchableOpacity>
      )}

      <BonusInventory />

      <NotificationSwitches settings={me?.notifications ?? null} onError={setError} />

      {/* Required by Google in Europe: change the choice made in the ads consent form */}
      {adPrivacy.isRequired && (
        <TouchableOpacity onPress={adPrivacy.open}>
          <Text style={styles.adPrivacy}>Gérer mes choix de pub</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <DeleteAccount onDeleted={handleLogout} onError={setError} />
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
  statsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  statsText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "800",
  },
  vipButton: {
    alignItems: "center",
    borderColor: colors.gold,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  vipText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: "800",
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  adminText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "800",
  },
  adPrivacy: {
    color: colors.muted,
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
    marginTop: 24,
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
