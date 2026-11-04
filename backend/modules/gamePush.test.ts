import { firstLock, isClosingSoonTime, isNewGridTime, missingPlayers, weekKey } from "./gamePush";

describe("weekKey", () => {
  it("joins the season and the week", () => {
    expect(weekKey(2026, 45)).toBe("2026-45");
  });
});

describe("isNewGridTime", () => {
  const monday = new Date(2026, 10, 2); // Monday 2 November 2026, 00:00

  it("waits for Monday 8:00", () => {
    expect(isNewGridTime(monday, new Date(2026, 10, 2, 7, 59))).toBe(false);
    expect(isNewGridTime(monday, new Date(2026, 10, 2, 8, 0))).toBe(true);
  });

  it("still sends later in the week (matches picked on Wednesday)", () => {
    expect(isNewGridTime(monday, new Date(2026, 10, 4, 15, 0))).toBe(true);
  });
});

describe("firstLock", () => {
  it("gives the earliest lock", () => {
    const events = [
      { _id: "a", lockAt: new Date(2026, 10, 7, 21) },
      { _id: "b", lockAt: new Date(2026, 10, 6, 18) },
      { _id: "c", lockAt: null },
    ];

    expect(firstLock(events)).toEqual(new Date(2026, 10, 6, 18));
  });

  it("gives null when no match can be predicted", () => {
    expect(firstLock([{ _id: "a" }])).toBeNull();
  });
});

describe("isClosingSoonTime", () => {
  const lock = new Date(2026, 10, 6, 18); // Friday 18:00

  it("is on during the 24 h before the lock", () => {
    expect(isClosingSoonTime(lock, new Date(2026, 10, 5, 17, 59))).toBe(false);
    expect(isClosingSoonTime(lock, new Date(2026, 10, 5, 18, 0))).toBe(true);
    expect(isClosingSoonTime(lock, new Date(2026, 10, 6, 17, 0))).toBe(true);
  });

  it("is off once the first match is locked, and without a lock", () => {
    expect(isClosingSoonTime(lock, new Date(2026, 10, 6, 18, 0))).toBe(false);
    expect(isClosingSoonTime(null, new Date())).toBe(false);
  });
});

describe("missingPlayers", () => {
  const predictions = [
    { user: "thomas", event: "m1" },
    { user: "thomas", event: "m2" },
    { user: "paul", event: "m1" },
  ];

  it("keeps the members with at least one open match left", () => {
    expect(missingPlayers(["thomas", "paul", "lea"], ["m1", "m2"], predictions)).toEqual(["paul", "lea"]);
  });

  it("keeps nobody when there is no open match", () => {
    expect(missingPlayers(["thomas", "paul"], [], predictions)).toEqual([]);
  });
});
