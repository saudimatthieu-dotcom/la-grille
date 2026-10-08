// The Thursday of the date's week, at midnight UTC — ISO 8601: a week belongs to the year of its Thursday
function weekThursday(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  return target;
}

// ISO week number (1 to 53) — weeks start on Monday
export function getWeek(date: Date) {
  const target = weekThursday(date);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// The season the week belongs to — always use it with getWeek, never date.getFullYear():
// Fri 1 Jan 2027 is in week 53 of 2026, so getFullYear() would give "season 2027, week 53"
export function getSeason(date: Date) {
  return weekThursday(date).getUTCFullYear();
}

// Monday 00:00 of a week, the other way round — 4 January is always in week 1 of its season
export function getWeekStart(season: number, week: number) {
  const january4 = new Date(season, 0, 4);
  const firstMonday = january4.getDate() - ((january4.getDay() + 6) % 7);
  return new Date(season, 0, firstMonday + (week - 1) * 7);
}

// Monday 00:00 of the date's week (local time)
export function getMonday(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
}
