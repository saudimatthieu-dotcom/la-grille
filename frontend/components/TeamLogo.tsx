import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../config/theme";

type Props = {
  logo?: string;
  size?: number;
};

// The club badge from TheSportsDB — or a shield icon when the API has none
export default function TeamLogo({ logo, size = 56 }: Props) {
  if (logo) {
    return <Image source={{ uri: logo }} style={{ width: size, height: size }} resizeMode="contain" />;
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="shield-outline" size={size * 0.5} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
