export const SPORT_ICONS = {
  football: "football-outline",
  basket: "basketball-outline",
  rugby: "american-football-outline",
  handball: "hand-left-outline",
  americanfootball: "american-football",
  hockey: "snow-outline",
  baseball: "baseball-outline",
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
  americanfootball: "Football américain",
  hockey: "Hockey sur glace",
  baseball: "Baseball",
  f1: "Formule 1",
  cyclisme: "Cyclisme",
  tennis: "Tennis",
};

// The team sports played on the winner and the total of points (same list as backend scoring.ts)
export const OVER_UNDER_SPORTS = ["basket", "rugby", "handball", "americanfootball", "hockey", "baseball"];

// Among them, the ones where a match can end in a draw (basket, hockey and baseball always play on to a winner)
export const DRAW_SPORTS = ["rugby", "handball", "americanfootball"];

// The sports played on a podium or a winner picked among the participants
export const PODIUM_SPORTS = ["f1", "cyclisme", "tennis"];
