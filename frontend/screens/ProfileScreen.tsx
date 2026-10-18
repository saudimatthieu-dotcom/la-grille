import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import type { RootState, RootStackParamList, TabParamList } from "../App";
import { colors } from "../config/theme";
import { AVATARS } from "../config/avatars";
import { BONUSES } from "../config/bonuses";
import { NOTIFICATIONS } from "../config/notifications";
import Avatar from "../components/Avatar";
import TacticIcon from "../components/TacticIcon";
import { login, logout } from "../reducers/user";
import type { NotificationKind, NotificationSettings } from "../types";
import { useMe } from "../utils/useMe";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Profil">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.value);
  // The VIP and admin status, from the server
  const me = useMe();

  const [username, setUsername] = useState(user.username ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // The notification switches: null until the server has answered
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    if (me) {
      setNotifications(me.notifications);
    }
  }, [me]);

  // Flips one switch straight away, then saves it — the server's answer wins (back to the old value if it failed)
  const toggleNotification = (kind: NotificationKind, value: boolean) => {
    if (!notifications) {
      return;
    }

    const previous = notifications;
    setNotifications({ ...notifications, [kind]: value });
    setError("");

    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/me/notifications`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: user.token, [kind]: value }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.result) {
          setNotifications(data.notifications);
        } else {
          setNotifications(previous);
          setError(data.error);
        }
      })
      .catch(() => {
        setNotifications(previous);
        setError("Impossible de contacter le serveur");
      });
  };

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

      {/* No stock to show any more: the bonuses are per league and per week, the BonusBar shows them */}
      <Text style={styles.section}>Mes bonus</Text>
      <View style={styles.inventory}>
        {BONUSES.map((bonus) => (
          <View key={bonus.kind} style={styles.inventoryItem}>
            <TacticIcon kind={bonus.kind} size={40} />
            <Text style={styles.inventoryText}>1 {bonus.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        Chaque semaine, dans chaque ligue privée. Un seul bonus par prono, perdu le lundi s&apos;il n&apos;est pas
        utilisé. Pas d&apos;Assurance en F1 ni en cyclisme.
      </Text>

      <Text style={styles.section}>Notifications</Text>
      {NOTIFICATIONS.map((item) => (
        <View key={item.kind} style={styles.notificationRow}>
          <View style={styles.notificationBody}>
            <Text style={styles.notificationLabel}>{item.label}</Text>
            <Text style={styles.notificationDescription}>{item.description}</Text>
          </View>
          <Switch
            value={notifications?.[item.kind] ?? false}
            onValueChange={(value) => toggleNotification(item.kind, value)}
            disabled={!notifications}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
      ))}

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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  inventoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inventoryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
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
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  notificationBody: {
    flex: 1,
  },
  notificationLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  notificationDescription: {
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
    marginTop: 32,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },
});
