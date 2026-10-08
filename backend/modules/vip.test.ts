import { extendVip, isVip } from "./vip";

describe("isVip", () => {
  const now = new Date(2026, 9, 8);

  it("is VIP until the end date", () => {
    expect(isVip({ vipUntil: new Date(2026, 10, 8) }, now)).toBe(true);
  });

  it("isn't VIP once the date has passed, or without one", () => {
    expect(isVip({ vipUntil: new Date(2026, 8, 8) }, now)).toBe(false);
    expect(isVip({ vipUntil: null }, now)).toBe(false);
  });
});

describe("extendVip", () => {
  const now = new Date(2026, 9, 8);

  it("starts from today when the pass has run out", () => {
    expect(extendVip(new Date(2026, 0, 1), 1, now)).toEqual(new Date(2026, 10, 8));
    expect(extendVip(null, 12, now)).toEqual(new Date(2027, 9, 8));
  });

  it("adds to what's left of an active pass", () => {
    expect(extendVip(new Date(2026, 10, 20), 1, now)).toEqual(new Date(2026, 11, 20));
  });
});
