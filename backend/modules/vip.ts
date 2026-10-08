// The VIP pass (client's list): sur-mesure grid (choose your matches), Stats screen, leagues with no player limit.
// No ads to remove yet, and the season length isn't configurable yet.

// A league whose owner isn't VIP stops at this many players
export const FREE_LEAGUE_MAX_MEMBERS = 10;

// Is the pass still active today?
export function isVip(user: { vipUntil?: Date | null }, now = new Date()) {
  return Boolean(user.vipUntil && user.vipUntil > now);
}

// The new end date when an admin gives some months: added to what's left, or from today when it has run out
export function extendVip(vipUntil: Date | null | undefined, months: number, now = new Date()) {
  const start = vipUntil && vipUntil > now ? new Date(vipUntil) : new Date(now);
  start.setMonth(start.getMonth() + months);
  return start;
}
