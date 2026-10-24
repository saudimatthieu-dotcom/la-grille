// The client's list (2026-10-24), by category — modules/moderation.ts compares whole words, ignoring capitals and accents
export const BANNED_WORDS = {
  insults: [
    "connard",
    "con",
    "conne",
    "enfoiré",
    "salope",
    "pute",
    "fils de pute",
    "bâtard",
    "enculé",
    "merde",
    "putain",
    "abruti",
    "débile",
    "bouffon",
    "trou du cul",
    "ta gueule",
    "va te faire foutre",
  ],
  harassment: [
    "ferme-la",
    "casse-toi",
    "dégage",
    "t'es nul",
    "t'es moche",
    "personne ne t'aime",
    "t'es une merde",
    "je te déteste",
    "tu ne vaux rien",
    "suicide-toi",
    "va mourir",
    "on va te retrouver",
    "tu vas le regretter",
  ],
  threats: [
    "je vais te tuer",
    "je vais te frapper",
    "je vais te faire du mal",
    "je vais te retrouver",
    "je vais te casser la gueule",
    "je vais te poignarder",
    "je vais te faire payer",
    "je vais te brûler",
    "je vais te détruire",
  ],
};

export type BannedCategory = keyof typeof BANNED_WORDS;

// Client's decision (2026-10-24): harassment and threats are always refused, insults only where everyone sees them
// Usernames (shown in the public league ranking) and the public league
export const PUBLIC_CATEGORIES: BannedCategory[] = ["insults", "harassment", "threats"];
// Private leagues of friends can chambrer: "bouffon", "t'es nul"… are allowed there
export const PRIVATE_CATEGORIES: BannedCategory[] = ["harassment", "threats"];
