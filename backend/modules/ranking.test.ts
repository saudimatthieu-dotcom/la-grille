import { buildRanking } from "./ranking";

const members = [
  { userId: "a", username: "Alice" },
  { userId: "b", username: "Bob" },
  { userId: "c", username: "Chloé" },
];

describe("buildRanking", () => {
  it("sorts from most to fewest points", () => {
    const ranking = buildRanking(members, { a: 2, b: 7, c: 4 });
    expect(ranking.map((row) => row.username)).toEqual(["Bob", "Chloé", "Alice"]);
    expect(ranking.map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it("gives the crown to the leader and the lanterne rouge to the last", () => {
    const ranking = buildRanking(members, { a: 2, b: 7, c: 4 });
    expect(ranking[0].isLeader).toBe(true);
    expect(ranking[2].isLastPlace).toBe(true);
    expect(ranking[1].isLeader || ranking[1].isLastPlace).toBe(false);
  });

  it("gives the same rank to tied players", () => {
    const ranking = buildRanking(members, { a: 5, b: 5, c: 1 });
    expect(ranking.map((row) => row.rank)).toEqual([1, 1, 3]);
  });

  it("gives no crown and no lanterne rouge when everyone is tied", () => {
    const ranking = buildRanking(members, {});
    expect(ranking.every((row) => row.points === 0 && row.rank === 1)).toBe(true);
    expect(ranking.some((row) => row.isLeader || row.isLastPlace)).toBe(false);
  });

  it("can have two lanternes rouges when they are tied last", () => {
    const ranking = buildRanking(members, { a: 1, b: 9, c: 1 });
    expect(ranking.filter((row) => row.isLastPlace)).toHaveLength(2);
  });
});
