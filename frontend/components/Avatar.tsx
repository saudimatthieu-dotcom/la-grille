import { StyleSheet, Text, View } from "react-native";

import { colors } from "../config/theme";

type Props = {
  avatar?: string | null;
  username?: string | null;
  size?: number;
};

// The player's emoji avatar in a circle — or the first letter of their name if they haven't picked one
export default function Avatar({ avatar, username, size = 36 }: Props) {
  const content = avatar || (username ?? "?").charAt(0).toUpperCase();

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: avatar ? size * 0.55 : size * 0.45 }]}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: colors.accent,
    fontWeight: "900",
  },
});
