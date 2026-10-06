export const SPORT_ICONS = {
  football: "football-outline",
  basket: "basketball-outline",
  rugby: "american-football-outline",
  handball: "hand-left-outline",
  f1: "car-sport-outline",
  cyclisme: "bicycle-outline",
  tennis: "tennisball-outline",
} as const;

// The sport's name, as shown to the players (stats screen)
export const SPORT_LABELS: Record<string, string> = {
  football: "Football",
  basket: "Basket",
  rugby: "Rugby",
  handball: "Handball",
  f1: "Formule 1",
  cyclisme: "Cyclisme",
  tennis: "Tennis",
};
