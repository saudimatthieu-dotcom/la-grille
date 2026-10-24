import { findBannedWord, normalize } from "./moderation";
import { PRIVATE_CATEGORIES } from "../config/bannedWords";

describe("normalize", () => {
  it("lowercases, removes accents and turns punctuation into single spaces", () => {
    expect(normalize("T’es NUL !!")).toBe("t es nul");
    expect(normalize("Enculé")).toBe("encule");
    expect(normalize("ferme-la...")).toBe("ferme la");
  });

  it("replaces digits and symbols used as letters", () => {
    expect(normalize("C0NN4RD")).toBe("connard");
    expect(normalize("s@lope")).toBe("salope");
  });
});

describe("findBannedWord", () => {
  it("lets normal messages through", () => {
    expect(findBannedWord("Allez l'OM !")).toBeNull();
    expect(findBannedWord("3-0 facile ce week-end")).toBeNull();
    expect(findBannedWord("Je joue contre toi en confiance")).toBeNull();
    expect(findBannedWord("Deuxième ou second, peu importe")).toBeNull();
    expect(findBannedWord("Le cône de glace")).toBeNull();
  });

  it("finds whole words, whatever the capitals and accents", () => {
    expect(findBannedWord("CONNARD")).toBe("connard");
    expect(findBannedWord("connârd")).toBe("connard");
    expect(findBannedWord("c'est con")).toBe("con");
    expect(findBannedWord("espèce d'enculé")).toBe("enculé");
  });

  it("finds phrases, with any apostrophe and spacing", () => {
    expect(findBannedWord("t’es nul")).toBe("t'es nul");
    expect(findBannedWord("Trou   du   cul")).toBe("trou du cul");
    expect(findBannedWord("ferme la")).toBe("ferme-la");
    expect(findBannedWord("je vais te tuer demain")).toBe("je vais te tuer");
  });

  it("catches simple tricks: digits, symbols, stretched letters", () => {
    expect(findBannedWord("c0nnard")).toBe("connard");
    expect(findBannedWord("connnnnard")).toBe("connard");
    expect(findBannedWord("puuuute")).toBe("pute");
    expect(findBannedWord("Mr.Merde")).toBe("merde");
  });

  it("lets friends chambrer in a private league, never threaten", () => {
    expect(findBannedWord("t'es qu'un bouffon", PRIVATE_CATEGORIES)).toBeNull();
    expect(findBannedWord("t'es qu'un bouffon")).toBe("bouffon");
    expect(findBannedWord("va mourir", PRIVATE_CATEGORIES)).toBe("va mourir");
  });

  it("only looks in the categories asked for", () => {
    expect(findBannedWord("t'es nul", ["threats"])).toBeNull();
    expect(findBannedWord("je vais te frapper", ["threats"])).toBe("je vais te frapper");
  });
});
