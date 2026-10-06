import { getSeason, getWeek, getWeekStart } from "./getWeek";

describe("getWeek and getSeason", () => {
  it("gives the week and the season of an ordinary day", () => {
    // Monday 5 Oct 2026
    expect(getWeek(new Date(2026, 9, 5))).toBe(41);
    expect(getSeason(new Date(2026, 9, 5))).toBe(2026);
  });

  it("files 1-3 January 2027 under week 53 of the 2026 season", () => {
    expect(getWeek(new Date(2027, 0, 1))).toBe(53);
    expect(getSeason(new Date(2027, 0, 1))).toBe(2026);
    expect(getSeason(new Date(2027, 0, 3))).toBe(2026);
  });

  it("starts the 2027 season on Monday 4 January", () => {
    expect(getWeek(new Date(2027, 0, 4))).toBe(1);
    expect(getSeason(new Date(2027, 0, 4))).toBe(2027);
  });

  it("files the last days of December under week 1 of the next season", () => {
    // Monday 29 Dec 2025 is in week 1 of 2026
    expect(getWeek(new Date(2025, 11, 29))).toBe(1);
    expect(getSeason(new Date(2025, 11, 29))).toBe(2026);
  });
});

describe("getWeekStart", () => {
  it("gives the Monday of a week", () => {
    expect(getWeekStart(2026, 41)).toEqual(new Date(2026, 9, 5));
  });

  it("finds the Mondays that are in the year before", () => {
    expect(getWeekStart(2026, 1)).toEqual(new Date(2025, 11, 29));
    expect(getWeekStart(2026, 53)).toEqual(new Date(2026, 11, 28));
  });

  it("is the reverse of getSeason + getWeek", () => {
    const monday = getWeekStart(2027, 10);
    expect(getSeason(monday)).toBe(2027);
    expect(getWeek(monday)).toBe(10);
  });
});
