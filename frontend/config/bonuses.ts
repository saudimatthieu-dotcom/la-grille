import type { ImageSourcePropType } from "react-native";

import type { BonusKind } from "../types";

// A bonus or the sabotage: each one has its neon icon (see components/TacticIcon)
export type TacticKind = BonusKind | "sabotage";

export const TACTIC_ICONS: Record<TacticKind, ImageSourcePropType> = {
  doubleur: require("../assets/bonuses/doubleur.png"),
  bouclier: require("../assets/bonuses/bouclier.png"),
  assurance: require("../assets/bonuses/assurance.png"),
  sabotage: require("../assets/bonuses/sabotage.png"),
};

// The 3 bonuses, as the BonusBar lists them
export const BONUSES: { kind: BonusKind; label: string; description: string }[] = [
  { kind: "doubleur", label: "Doubleur", description: "Double tes points" },
  { kind: "bouclier", label: "Bouclier", description: "Protège du sabotage" },
  { kind: "assurance", label: "Assurance", description: "Le max même si tu es en partie juste" },
];

// The backend starts its chat logs with an emoji ("⚡ Julien a utilisé un Doubleur…"):
// we show the icon instead, so the old messages already saved get it too
const EMOJI_KINDS: [string, TacticKind][] = [
  ["⚡", "doubleur"],
  ["🛡️", "bouclier"],
  ["🛡", "bouclier"],
  ["💣", "sabotage"],
  ["☂️", "assurance"],
  ["☂", "assurance"],
];

export function splitTacticText(text: string): { kind: TacticKind | null; text: string } {
  const found = EMOJI_KINDS.find(([emoji]) => text.startsWith(emoji));

  if (!found) {
    return { kind: null, text };
  }
  return { kind: found[1], text: text.slice(found[0].length).trim() };
}
