export const GRID_TYPES = [
  {
    value: "officielle",
    label: "Officielle",
    description: "Tous les sports, dont du sport féminin",
    icon: "trophy-outline",
    premium: false,
  },
  {
    value: "classique",
    label: "Classique",
    description: "Foot, rugby, basket, tennis",
    icon: "star-outline",
    premium: false,
  },
  {
    value: "exotique",
    label: "Exotique",
    description: "F1, MMA, vélo, handball, baseball",
    icon: "globe-outline",
    premium: false,
  },
  {
    value: "surmesure",
    label: "Sur-mesure",
    description: "Tu choisis les matchs chaque semaine",
    icon: "lock-closed-outline",
    premium: true,
  },
] as const;
