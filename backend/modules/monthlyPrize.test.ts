import { monthBounds, monthKey, pickWinners, previousMonthKey } from "./monthlyPrize";

describe("months", () => {
  it("names a month and finds its bounds", () => {
    expect(monthKey(new Date(2026, 9, 8))).toBe("2026-10");
    expect(monthBounds("2026-12")).toEqual({ start: new Date(2026, 11, 1), end: new Date(2027, 0, 1) });
  });

  it("finds last month, across the new year", () => {
    expect(previousMonthKey(new Date(2026, 10, 2))).toBe("2026-10");
    expect(previousMonthKey(new Date(2027, 0, 3))).toBe("2026-12");
  });
});

describe("pickWinners", () => {
  it("gives the prize to the best player", () => {
    expect(pickWinners({ thomas: 30, paul: 12 })).toEqual(["thomas"]);
  });

  it("gives it to every player tied first", () => {
    expect(pickWinners({ thomas: 30, paul: 30, lea: 5 })).toEqual(["thomas", "paul"]);
  });

  it("gives nothing when nobody scored", () => {
    expect(pickWinners({ thomas: 0 })).toEqual([]);
    expect(pickWinners({})).toEqual([]);
  });
});
