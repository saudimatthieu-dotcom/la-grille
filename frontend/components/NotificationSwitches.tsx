import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useSelector } from "react-redux";

import type { RootState } from "../App";
import { NOTIFICATIONS } from "../config/notifications";
import { colors } from "../config/theme";
import { saveNotifications } from "../data/users";
import type { NotificationKind, NotificationSettings } from "../types";

type Props = {
  // What the server says (my profile): null until it has answered
  settings: NotificationSettings | null;
  // The Profil page shows the errors, with its own
  onError: (message: string) => void;
};

// The "Notifications" section of the Profil page: one switch per kind of game notification
export default function NotificationSwitches({ settings, onError }: Props) {
  const token = useSelector((state: RootState) => state.user.value.token);

  // The switches: null until the server has answered
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setNotifications(settings);
    }
  }, [settings]);

  // Flips one switch straight away, then saves it — the server's answer wins (back to the old value if it failed)
  const toggleNotification = (kind: NotificationKind, value: boolean) => {
    if (!notifications) {
      return;
    }

    const previous = notifications;
    setNotifications({ ...notifications, [kind]: value });
    onError("");

    saveNotifications({ token, [kind]: value })
      .then((data) => {
        if (data.result) {
          setNotifications(data.notifications);
        } else {
          setNotifications(previous);
          onError(data.error);
        }
      })
      .catch(() => {
        setNotifications(previous);
        onError("Impossible de contacter le serveur");
      });
  };

  return (
    <View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 8,
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
});
