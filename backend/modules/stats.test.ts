import { computeStats } from "./stats";

const predictions = [
  { id: "p1", sport: "football", points: 3 }, // exact score
  { id: "p2", sport: "football", points: 1 }, // right winner
  { id: "p3", sport: "football", points: 0 },
  { id: "p4", sport: "basket", points: 2 }, // max in basket
  { id: "p5", sport: "f1", points: 0 },
];

describe("computeStats", () => {
  it("counts the correct and the perfect predictions", () => {
    const stats = computeStats(predictions, [], []);

    expect(stats.total).toBe(5);
    expect(stats.correct).toBe(3);
    expect(stats.perfect).toBe(2);
  });

  it("gives one line per sport, the most played first", () => {
    const stats = computeStats(predictions, [], []);

    expect(stats.bySport[0]).toEqual({ sport: "football", total: 3, correct: 2 });
    expect(stats.bySport).toContainEqual({ sport: "f1", total: 1, correct: 0 });
  });

  it("knows when a doubleur paid off", () => {
    const stats = computeStats(
      predictions,
      [
        { kind: "doubleur", predictionId: "p1" },
        { kind: "doubleur", predictionId: "p3" },
      ],
      []
    );

    expect(stats.bonuses.doubleur).toEqual({ used: 2, paid: 1 });
  });

  it("counts an assurance only when it raised a partly right prediction", () => {
    const stats = computeStats(
      predictions,
      [
        { kind: "assurance", predictionId: "p2" }, // 1 → 3: paid off
        { kind: "assurance", predictionId: "p1" }, // already the max
        { kind: "assurance", predictionId: "p3" }, // 0 stays 0
      ],
      []
    );

    expect(stats.bonuses.assurance).toEqual({ used: 3, paid: 1 });
  });

  it("counts a bouclier when a sabotage really hit it", () => {
    const stats = computeStats(
      predictions,
      [
        { kind: "bouclier", predictionId: "p1" },
        { kind: "bouclier", predictionId: "p2" },
      ],
      ["p1"]
    );

    expect(stats.bonuses.bouclier).toEqual({ used: 2, paid: 1 });
  });

  it("ignores the bonuses on predictions not scored yet", () => {
    const stats = computeStats(predictions, [{ kind: "doubleur", predictionId: "not-scored" }], []);

    expect(stats.bonuses.doubleur).toEqual({ used: 0, paid: 0 });
  });

  it("works with no prediction at all", () => {
    expect(computeStats([], [], []).total).toBe(0);
  });
});
