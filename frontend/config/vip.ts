// Same rule as the backend (modules/vip.ts): a league whose owner isn't VIP stops at this many players
export const FREE_LEAGUE_MAX_MEMBERS = 10;

// What the VIP pass gives (the client's list — no ads to remove yet, the season length isn't configurable yet)
export const VIP_PERKS: { icon: "options-outline" | "stats-chart-outline" | "people-outline"; title: string; description: string }[] = [
  {
    icon: "options-outline",
    title: "Grille sur-mesure",
    description: "Crée une ligue où tu choisis toi-même les matchs de chaque semaine.",
  },
  {
    icon: "stats-chart-outline",
    title: "Mes stats",
    description: "% de pronos justes, par sport, et tes bonus bien placés.",
  },
  {
    icon: "people-outline",
    title: "Ligues illimitées",
    description: `Autant de joueurs que tu veux dans tes ligues (${FREE_LEAGUE_MAX_MEMBERS} max sans VIP).`,
  },
];
