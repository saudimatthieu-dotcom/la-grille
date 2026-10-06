import { formatRecap } from "./weeklyRecap";

describe("formatRecap", () => {
  it("lists the players of the week, best first", () => {
    const ranking = [
      { username: "Thomas", points: 12 },
      { username: "Paul", points: 8 },
      { username: "Léa", points: 0 },
    ];
    expect(formatRecap(41, ranking)).toBe("📊 Semaine 41 : Thomas 12 pts, Paul 8 pts, Léa 0 pts");
  });

  it("stops after 10 players", () => {
    const ranking = Array.from({ length: 12 }, (_, index) => ({ username: `J${index + 1}`, points: 12 - index }));
    const text = formatRecap(41, ranking);

    expect(text).toContain("J10 3 pts");
    expect(text).not.toContain("J11");
    expect(text.endsWith(", …")).toBe(true);
  });
});
