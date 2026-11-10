import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AVATARS } from "../config/avatars";
import { colors } from "../config/theme";

type Props = {
  // The avatar I have now: it gets the accent border
  selected?: string | null;
  onSelect: (avatar: string) => void;
};

// The grid of emoji avatars on the Profil page: a tap picks one
export default function AvatarPicker({ selected, onSelect }: Props) {
  const choices = AVATARS.map((avatar) => (
    <TouchableOpacity
      key={avatar}
      style={[styles.avatarChoice, selected === avatar && styles.avatarSelected]}
      onPress={() => onSelect(avatar)}
    >
      <Text style={styles.avatarEmoji}>{avatar}</Text>
    </TouchableOpacity>
  ));

  return <View style={styles.avatarGrid}>{choices}</View>;
}

const styles = StyleSheet.create({
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
});
