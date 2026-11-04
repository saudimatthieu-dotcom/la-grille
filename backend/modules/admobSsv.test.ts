import crypto from "crypto";

import { isValidSignature, splitSsvQuery } from "./admobSsv";

// A key pair like Google's (ECDSA P-256): we sign as Google would, then check as the server does
const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();

const message =
  "ad_network=5450213213286189855&ad_unit=1234567890&custom_data=665f1c2a9b1e8a0012345678&reward_amount=1" +
  "&reward_item=doubleur&timestamp=1730700000000&transaction_id=abc123&user_id=665f1c2a9b1e8a0087654321";

function sign(text: string) {
  return crypto.sign("sha256", Buffer.from(text), privateKey).toString("base64url");
}

describe("splitSsvQuery", () => {
  it("separates what Google signed from the signature and the key id", () => {
    const parts = splitSsvQuery(`${message}&signature=SIG_123&key_id=3335741209`);

    expect(parts).toEqual({ message, signature: "SIG_123", keyId: "3335741209" });
  });

  it("gives null without a signature", () => {
    expect(splitSsvQuery(message)).toBeNull();
  });
});

describe("isValidSignature", () => {
  it("accepts the message Google signed", () => {
    expect(isValidSignature(message, sign(message), pem)).toBe(true);
  });

  it("refuses a message changed after signing (someone giving themselves the reward)", () => {
    const forged = message.replace("user_id=665f1c2a9b1e8a0087654321", "user_id=665f1c2a9b1e8a00aaaaaaaa");

    expect(isValidSignature(forged, sign(message), pem)).toBe(false);
  });

  it("refuses a signature that isn't one", () => {
    expect(isValidSignature(message, "not-a-signature", pem)).toBe(false);
  });
});
