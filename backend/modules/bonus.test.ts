import { bonusError, bonusStock } from "./bonus";

describe("bonusStock", () => {
  it("gives 1 of each when nothing is used this week", () => {
    expect(bonusStock([])).toEqual({ doubleur: 1, assurance: 1, bouclier: 1 });
  });

  it("takes off the bonuses already used", () => {
    const tactics = [{ kind: "doubleur", prediction: "p1" }];
    expect(bonusStock(tactics)).toEqual({ doubleur: 0, assurance: 1, bouclier: 1 });
  });

  it("gives back the bonus already on the prediction being saved", () => {
    const tactics = [
      { kind: "doubleur", prediction: "p1" },
      { kind: "bouclier", prediction: "p2" },
    ];
    expect(bonusStock(tactics, "p1")).toEqual({ doubleur: 1, assurance: 1, bouclier: 0 });
  });
});

describe("bonusError", () => {
  const fullStock = { doubleur: 1, assurance: 1, bouclier: 1 };

  it("accepts a bonus in stock", () => {
    expect(bonusError("doubleur", false, "football", fullStock)).toBeNull();
  });

  it("refuses any bonus in the public league", () => {
    expect(bonusError("doubleur", true, "football", fullStock)).toBe("No bonus in the public league");
  });

  it("refuses the assurance in F1", () => {
    expect(bonusError("assurance", false, "f1", fullStock)).toBe("No assurance in F1 and cycling");
  });

  it("refuses a bonus already used this week", () => {
    expect(bonusError("bouclier", false, "rugby", { ...fullStock, bouclier: 0 })).toBe("No bonus left this week");
  });
});
