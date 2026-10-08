// Which matches each type of grid plays — from the client's brief:
//   Officielle = all sports, including some women's matches
//   Classique  = the popular sports (foot, rugby, basket, tennis)
//   Exotique   = NO foot, NO rugby, NO NBA — but F1, MMA, cycling, handball, baseball
// The weekly grid holds every match; each league sees the part of it that fits its type.

type GridEvent = {
  sport?: string | null;
  competition?: string | null;
};

const CLASSIQUE_SPORTS = ["football", "rugby", "basket", "tennis"];

// "mma" and "baseball" aren't imported yet: they're listed so they join the grid as soon as they are
const EXOTIQUE_SPORTS = ["f1", "mma", "cyclisme", "handball", "baseball", "basket"];

// Basket is exotique except the NBA (the client's "PAS NBA": the Betclic Élite stays in)
const EXOTIQUE_EXCLUDED_COMPETITIONS = ["NBA"];

// Is this match in a grid of this type? Officielle (the public league) and unknown types: every match
export function isInGrid(gridType: string | null | undefined, event: GridEvent) {
  const sport = event.sport ?? "";

  if (gridType === "classique") {
    return CLASSIQUE_SPORTS.includes(sport);
  }

  if (gridType === "exotique") {
    return EXOTIQUE_SPORTS.includes(sport) && !EXOTIQUE_EXCLUDED_COMPETITIONS.includes(event.competition ?? "");
  }

  return true;
}

// The grid types whose matches admins pick (sur-mesure leagues pick their own)
export const ADMIN_GRID_TYPES = ["officielle", "classique", "exotique"] as const;
export type AdminGridType = (typeof ADMIN_GRID_TYPES)[number];

// Is this match played by a league? The matches picked by hand when there are some, else the automatic rule.
// picked = ids of the week's selection (null or empty: nothing picked)
export function isPlayed(gridType: string | null | undefined, event: GridEvent & { _id: unknown }, picked: string[] | null) {
  if (picked && picked.length > 0) {
    return picked.includes(String(event._id));
  }

  return isInGrid(gridType, event);
}
