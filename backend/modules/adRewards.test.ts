import { AD_DOUBLEURS_PER_WEEK, adRewardError, canEarnAdReward } from "./adRewards";
import { bonusStock } from "./bonus";

describe("canEarnAdReward", () => {
  it("allows one ad doubleur per league per week", () => {
    expect(AD_DOUBLEURS_PER_WEEK).toBe(1);
    expect(canEarnAdReward(0)).toBe(true);
    expect(canEarnAdReward(1)).toBe(false);
  });
});

describe("adRewardError", () => {
  const league = { isPublic: false, members: [{ user: "thomas" }, { user: "paul" }] };

  it("gives the doubleur to a member of a private league", () => {
    expect(adRewardError(league, "thomas")).toBeNull();
  });

  it("refuses the public league, a non-member and an unknown league", () => {
    expect(adRewardError({ ...league, isPublic: true }, "thomas")).toBe("No bonus in the public league");
    expect(adRewardError(league, "lea")).toBe("Not a member of this league");
    expect(adRewardError(null, "thomas")).toBe("League not found");
  });
});

describe("bonusStock with ad doubleurs", () => {
  it("adds the doubleur earned with an ad to the weekly one", () => {
    expect(bonusStock([], undefined, 1)).toEqual({ doubleur: 2, assurance: 1, bouclier: 1 });
  });

  it("lets a second doubleur be used once the weekly one is on a prediction", () => {
    const tactics = [{ kind: "doubleur", prediction: "p1" }];

    expect(bonusStock(tactics, undefined, 0).doubleur).toBe(0);
    expect(bonusStock(tactics, undefined, 1).doubleur).toBe(1);
  });
});
