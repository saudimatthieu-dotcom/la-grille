import { isInGrid, isPlayed } from "./gridTypes";

const ligue1 = { sport: "football", competition: "Ligue 1" };
const top14 = { sport: "rugby", competition: "Top 14" };
const nba = { sport: "basket", competition: "NBA" };
const betclic = { sport: "basket", competition: "Betclic Élite" };
const tennis = { sport: "tennis", competition: "Roland-Garros" };
const f1 = { sport: "f1", competition: "Grand Prix de Monaco" };
const handball = { sport: "handball", competition: "Liqui Moly Starligue" };

describe("isInGrid", () => {
  it("puts every match in the officielle grid", () => {
    [ligue1, top14, nba, betclic, tennis, f1, handball].forEach((event) => {
      expect(isInGrid("officielle", event)).toBe(true);
    });
  });

  it("keeps only foot, rugby, basket and tennis in the classique grid", () => {
    expect(isInGrid("classique", ligue1)).toBe(true);
    expect(isInGrid("classique", top14)).toBe(true);
    expect(isInGrid("classique", nba)).toBe(true);
    expect(isInGrid("classique", tennis)).toBe(true);
    expect(isInGrid("classique", f1)).toBe(false);
    expect(isInGrid("classique", handball)).toBe(false);
  });

  it("has no foot, no rugby and no NBA in the exotique grid", () => {
    expect(isInGrid("exotique", ligue1)).toBe(false);
    expect(isInGrid("exotique", top14)).toBe(false);
    expect(isInGrid("exotique", nba)).toBe(false);
  });

  it("puts F1, handball and the other basket in the exotique grid", () => {
    expect(isInGrid("exotique", f1)).toBe(true);
    expect(isInGrid("exotique", handball)).toBe(true);
    expect(isInGrid("exotique", betclic)).toBe(true);
  });

  it("leaves tennis out of the exotique grid: it's a popular sport", () => {
    expect(isInGrid("exotique", tennis)).toBe(false);
  });

  it("plays every match for an unknown type", () => {
    expect(isInGrid(undefined, f1)).toBe(true);
    expect(isInGrid("surmesure", ligue1)).toBe(true);
  });
});

describe("isPlayed", () => {
  const psg = { _id: "e1", sport: "football", competition: "Ligue 1" };
  const gp = { _id: "e2", sport: "f1", competition: "Formula 1" };

  it("plays no match when nothing is picked (no automatic grid)", () => {
    expect(isPlayed(psg, null)).toBe(false);
    expect(isPlayed(gp, [])).toBe(false);
  });

  it("only plays the picked matches", () => {
    expect(isPlayed(psg, ["e2"])).toBe(false);
    expect(isPlayed(gp, ["e2"])).toBe(true);
  });
});
