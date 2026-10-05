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
