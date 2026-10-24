import { BANNED_WORDS, PUBLIC_CATEGORIES } from "../config/bannedWords";
import type { BannedCategory } from "../config/bannedWords";

// Digits and symbols used to get round the filter (c0nnard, s@lope)
const LOOKALIKES: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a", "$": "s" };

// Lowercase, no accents, lookalikes replaced, and anything that isn't a letter becomes one space
// (apostrophes ' and ’, hyphens, dots…): "T’es NUL !!" → "t es nul"
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[01345@$]/g, (char) => LOOKALIKES[char])
    .replace(/[^a-z]+/g, " ")
    .trim();
}

// The list, normalized once when the server starts
const NORMALIZED = Object.fromEntries(
  Object.entries(BANNED_WORDS).map(([category, words]) => [
    category,
    words.map((word) => ({ word, normalized: normalize(word) })),
  ])
) as Record<BannedCategory, { word: string; normalized: string }[]>;

// The first banned word or phrase found in the text (as written in the list), or null if the text is clean.
// Whole words only: "con" is found in "c'est con" but not in "contre" or "second".
// Stretched letters are caught too: "connnnard" (3+ letters → 2) and "puuuute" (→ 1)
// All categories by default — pass PRIVATE_CATEGORIES for a private league's chat
export function findBannedWord(text: string, categories: BannedCategory[] = PUBLIC_CATEGORIES): string | null {
  const normalized = normalize(text);
  const versions = [normalized.replace(/([a-z])\1{2,}/g, "$1$1"), normalized.replace(/([a-z])\1{2,}/g, "$1")];

  for (const category of categories) {
    for (const { word, normalized: banned } of NORMALIZED[category]) {
      // Spaces around both sides: only whole words (and whole phrases) match
      if (versions.some((version) => ` ${version} `.includes(` ${banned} `))) {
        return word;
      }
    }
  }

  return null;
}
