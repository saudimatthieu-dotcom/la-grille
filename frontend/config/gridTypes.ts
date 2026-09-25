export const GRID_TYPES = [
  {
    value: "officielle",
    label: "Officielle",
    description: "10 événements équilibrés",
    icon: "trophy-outline",
    premium: false,
  },
  {
    value: "classique",
    label: "Classique",
    description: "Les sports populaires",
    icon: "star-outline",
    premium: false,
  },
  {
    value: "exotique",
    label: "Exotique",
    description: "Sports moins médiatisés",
    icon: "globe-outline",
    premium: false,
  },
  {
    value: "surmesure",
    label: "Sur-mesure",
    description: "Choisis tes 10 événements",
    icon: "lock-closed-outline",
    premium: true,
  },
] as const;
