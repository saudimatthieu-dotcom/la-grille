// Same rule as the backend (modules/vip.ts): a league whose owner isn't VIP stops at this many players
export const FREE_LEAGUE_MAX_MEMBERS = 10;

// Same rule as the backend (modules/seasons.ts): a season lasts 10 weeks — a VIP creator chooses 4 to 30
export const DEFAULT_SEASON_WEEKS = 10;
export const MIN_SEASON_WEEKS = 4;
export const MAX_SEASON_WEEKS = 30;

// What the VIP pass gives (the client's list — no ads to remove yet)
export const VIP_PERKS: {
  icon: "options-outline" | "stats-chart-outline" | "people-outline" | "calendar-outline";
  title: string;
  description: string;
}[] = [
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
  {
    icon: "calendar-outline",
    title: "Durée de saison",
    description: `Choisis la durée des saisons de tes ligues : de ${MIN_SEASON_WEEKS} à ${MAX_SEASON_WEEKS} semaines (${DEFAULT_SEASON_WEEKS} sans VIP).`,
  },
];
