import type { NotificationKind } from "../types";

// The 3 notifications, as the Profil switches list them
export const NOTIFICATIONS: { kind: NotificationKind; label: string; description: string }[] = [
  { kind: "newGrid", label: "Nouvelle grille", description: "Les matchs de la semaine sont choisis" },
  { kind: "closingSoon", label: "Fermeture de la grille", description: "La grille va bientôt se fermer" },
  { kind: "results", label: "Résultats", description: "Les résultats sont arrivés" },
];
