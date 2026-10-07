import type { BonusKind } from "../types";

// The 3 bonuses, as the BonusBar lists them — the icon also marks the match in the grid
export const BONUSES: { kind: BonusKind; label: string; description: string; icon: "flash" | "umbrella" | "shield" }[] = [
  { kind: "doubleur", label: "Doubleur", description: "Double tes points", icon: "flash" },
  { kind: "bouclier", label: "Bouclier", description: "Protège du sabotage", icon: "shield" },
  { kind: "assurance", label: "Assurance", description: "Le max même si tu es en partie juste", icon: "umbrella" },
];
