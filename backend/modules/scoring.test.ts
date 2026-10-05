import { applyTactics, isBonusAllowed, pointsInLeague, scoreFootball, scoreOverUnder, scorePodium, scoreTennis, scorePrediction } from "./scoring";

describe("scoreFootball", () => {
  const result = { homeScore: 2, awayScore: 1 };

  it("gives 3 pts for the exact score", () => {
    expect(scoreFootball({ homeScore: 2, awayScore: 1 }, result)).toBe(3);
  });

  it("gives 1 pt for the right winner with a wrong score", () => {
    expect(scoreFootball({ homeScore: 3, awayScore: 0 }, result)).toBe(1);
  });

  it("gives 1 pt for predicting a draw when it is a draw", () => {
    expect(scoreFootball({ homeScore: 0, awayScore: 0 }, { homeScore: 1, awayScore: 1 })).toBe(1);
  });

  it("gives 0 pt for the wrong winner", () => {
    expect(scoreFootball({ homeScore: 0, awayScore: 2 }, result)).toBe(0);
  });

  it("gives 3 pts (not 4) for an exact 0-0", () => {
    expect(scoreFootball({ homeScore: 0, awayScore: 0 }, { homeScore: 0, awayScore: 0 })).toBe(3);
  });
});

describe("scoreOverUnder", () => {
  // 110 + 104 = 214 → under 227.5
  const result = { homeScore: 110, awayScore: 104 };

  it("gives 2 pts for the right winner and the right over/under", () => {
    expect(scoreOverUnder({ winner: "home", overUnder: "under" }, result, 227.5)).toBe(2);
  });

  it("gives 1 pt for the right winner only", () => {
    expect(scoreOverUnder({ winner: "home", overUnder: "over" }, result, 227.5)).toBe(1);
  });

  it("gives 1 pt for the right over/under only", () => {
    expect(scoreOverUnder({ winner: "away", overUnder: "under" }, result, 227.5)).toBe(1);
  });

  it("gives 0 pt when both are wrong", () => {
    expect(scoreOverUnder({ winner: "away", overUnder: "over" }, result, 227.5)).toBe(0);
  });

  it("gives no winner point on a rugby draw", () => {
    // 20 + 20 = 40 → under 42.5
    expect(scoreOverUnder({ winner: "home", overUnder: "under" }, { homeScore: 20, awayScore: 20 }, 42.5)).toBe(1);
  });

  it("gives the winner point for predicting a rugby draw when it is a draw", () => {
    // 20 + 20 = 40 → under 42.5
    expect(scoreOverUnder({ winner: "draw", overUnder: "under" }, { homeScore: 20, awayScore: 20 }, 42.5)).toBe(2);
  });
});

describe("scorePodium", () => {
  const result = { podium: ["Verstappen", "Leclerc", "Norris"] };

  it("gives 6 pts for the perfect podium", () => {
    expect(scorePodium({ podium: ["Verstappen", "Leclerc", "Norris"] }, result)).toBe(6);
  });

  it("gives 3 pts for the right 3 drivers all in the wrong place", () => {
    expect(scorePodium({ podium: ["Leclerc", "Norris", "Verstappen"] }, result)).toBe(3);
  });

  it("mixes 2 pts (right place) and 1 pt (wrong place)", () => {
    // Verstappen right place: 2 — Norris on the podium, wrong place: 1 — Hamilton not on it: 0
    expect(scorePodium({ podium: ["Verstappen", "Norris", "Hamilton"] }, result)).toBe(3);
  });

  it("gives 0 pt when no driver is on the podium", () => {
    expect(scorePodium({ podium: ["Hamilton", "Piastri", "Russell"] }, result)).toBe(0);
  });
});

describe("scoreTennis", () => {
  const result = { winner: "Alcaraz", finalist: "Sinner" };

  it("gives 3 pts for the exact final", () => {
    expect(scoreTennis({ winner: "Alcaraz", finalist: "Sinner" }, result)).toBe(3);
  });

  it("gives 2 pts for both finalists swapped", () => {
    expect(scoreTennis({ winner: "Sinner", finalist: "Alcaraz" }, result)).toBe(2);
  });

  it("gives 2 pts for the right winner and a wrong finalist", () => {
    expect(scoreTennis({ winner: "Alcaraz", finalist: "Djokovic" }, result)).toBe(2);
  });

  it("gives 1 pt when only the predicted finalist reached the final", () => {
    expect(scoreTennis({ winner: "Djokovic", finalist: "Sinner" }, result)).toBe(1);
  });

  it("gives 0 pt when neither reached the final", () => {
    expect(scoreTennis({ winner: "Djokovic", finalist: "Zverev" }, result)).toBe(0);
  });
});

describe("scorePrediction", () => {
  it("picks the rule for each sport", () => {
    expect(scorePrediction("football", { homeScore: 1, awayScore: 0 }, { homeScore: 1, awayScore: 0 })).toBe(3);
    expect(scorePrediction("rugby", { winner: "away", overUnder: "over" }, { homeScore: 10, awayScore: 40 }, 42.5)).toBe(2);
    expect(scorePrediction("f1", { podium: ["A", "B", "C"] }, { podium: ["A", "B", "C"] })).toBe(6);
    expect(scorePrediction("tennis", { winner: "A", finalist: "B" }, { winner: "A", finalist: "B" })).toBe(3);
  });

  it("gives 0 pt for an unknown sport", () => {
    expect(scorePrediction("curling", {}, {})).toBe(0);
  });
});

describe("applyTactics", () => {
  it("keeps the points without any bonus", () => {
    expect(applyTactics(1, "football", {})).toBe(1);
  });

  it("doubles the points with the doubleur", () => {
    expect(applyTactics(3, "football", { doubleur: true })).toBe(6);
  });

  it("gives nothing extra with the doubleur on a wrong prediction", () => {
    expect(applyTactics(0, "football", { doubleur: true })).toBe(0);
  });

  it("gives the max with the assurance on a partly right prediction", () => {
    expect(applyTactics(1, "football", { assurance: true })).toBe(3);
    expect(applyTactics(2, "f1", { assurance: true })).toBe(6);
  });

  it("gives nothing with the assurance on a fully wrong prediction", () => {
    expect(applyTactics(0, "basket", { assurance: true })).toBe(0);
  });

});

describe("pointsInLeague", () => {
  it("keeps the raw points without bonus or sabotage in this league", () => {
    expect(pointsInLeague(1, "football", {}, false)).toBe(1);
  });

  it("adds this league's doubleur", () => {
    expect(pointsInLeague(3, "football", { doubleur: true }, false)).toBe(6);
  });

  it("adds this league's assurance", () => {
    expect(pointsInLeague(1, "football", { assurance: true }, false)).toBe(3);
  });

  it("sets a sabotaged prediction to 0, doubleur or not", () => {
    expect(pointsInLeague(3, "football", { doubleur: true }, true)).toBe(0);
  });

  it("keeps the points when the bouclier blocks the sabotage", () => {
    expect(pointsInLeague(3, "football", { bouclier: true }, true)).toBe(3);
  });
});

describe("isBonusAllowed", () => {
  it("refuses the assurance in F1 and cycling", () => {
    expect(isBonusAllowed("assurance", "f1")).toBe(false);
    expect(isBonusAllowed("assurance", "cyclisme")).toBe(false);
  });

  it("allows the doubleur and the bouclier in F1", () => {
    expect(isBonusAllowed("doubleur", "f1")).toBe(true);
    expect(isBonusAllowed("bouclier", "f1")).toBe(true);
  });

  it("allows the assurance in football", () => {
    expect(isBonusAllowed("assurance", "football")).toBe(true);
  });
});
