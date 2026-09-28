import { StyleSheet, View } from "react-native";

import { colors } from "../config/theme";

type Props = {
  value: number;
  max: number;
};

// A thin bar filled in yellow: 7 / 10 → 70 %
export default function ProgressBar({ value, max }: Props) {
  const percent = max > 0 ? Math.min(value / max, 1) * 100 : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
});
