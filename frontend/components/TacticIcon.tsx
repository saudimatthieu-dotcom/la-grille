import { Image } from "react-native";

import { TACTIC_ICONS, type TacticKind } from "../config/bonuses";

type Props = {
  kind: TacticKind;
  size?: number;
  // Dimmed (a bonus that isn't switched on)
  faded?: boolean;
};

// The neon icon of a bonus or of the sabotage — the same one everywhere in the app
export default function TacticIcon({ kind, size = 28, faded = false }: Props) {
  return <Image source={TACTIC_ICONS[kind]} style={{ width: size, height: size, opacity: faded ? 0.6 : 1 }} />;
}
