import { formatPodium, seasonEndsAt, seasonLength, seasonState, seasonWeekIndex } from "./seasons";

// A 10-week season starting Monday 5 October 2026: it ends Monday 14 December
const league = { seasonStartsAt: new Date(2026, 9, 5), seasonWeeks: 10, seasonStatus: "running" };

describe("seasonEndsAt", () => {
  it("ends the Monday after the last week", () => {
    expect(seasonEndsAt(league)).toEqual(new Date(2026, 11, 14));
  });
});

describe("seasonState", () => {
  it("is running during the 10 weeks", () => {
    expect(seasonState(league, new Date(2026, 11, 13, 22))).toBe("running");
  });

  it("is ending once the weeks are over, until the season is closed", () => {
    expect(seasonState(league, new Date(2026, 11, 14))).toBe("ending");
  });

  it("is finished once closed, and null for the public league", () => {
    expect(seasonState({ ...league, seasonStatus: "finished" })).toBe("finished");
    expect(seasonState({ ...league, isPublic: true })).toBeNull();
  });
});

describe("seasonWeekIndex", () => {
  it("counts the weeks from 1", () => {
    expect(seasonWeekIndex(league, new Date(2026, 9, 8))).toBe(1);
    expect(seasonWeekIndex(league, new Date(2026, 9, 12))).toBe(2);
    expect(seasonWeekIndex(league, new Date(2027, 0, 20))).toBe(10);
  });
});

describe("seasonLength", () => {
  it("gives 10 weeks to everyone who isn't VIP, whatever they ask", () => {
    expect(seasonLength(20, false)).toBe(10);
    expect(seasonLength(undefined, true)).toBe(10);
  });

  it("lets a VIP choose 4 to 30 weeks", () => {
    expect(seasonLength(4, true)).toBe(4);
    expect(seasonLength("30", true)).toBe(30);
    expect(seasonLength(3, true)).toBeNull();
    expect(seasonLength(31, true)).toBeNull();
  });
});

describe("formatPodium", () => {
  it("lists the podium with medals, ties sharing one", () => {
    const podium = [
      { username: "Thomas", points: 54, rank: 1 },
      { username: "Paul", points: 40, rank: 2 },
      { username: "Léa", points: 40, rank: 2 },
    ];
    expect(formatPodium(2, podium)).toBe("🏆 Fin de la saison 2 ! 🥇 Thomas 54 pts · 🥈 Paul 40 pts · 🥈 Léa 40 pts");
  });
});
