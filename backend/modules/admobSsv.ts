import crypto from "crypto";

// AdMob server-side verification (SSV): when a player finishes a rewarded ad, Google calls our URL
//   /ads/reward?ad_network=…&ad_unit=…&custom_data=…&reward_amount=…&reward_item=…&timestamp=…&transaction_id=…&user_id=…&signature=…&key_id=…
// signed with one of Google's private keys. We check the signature with Google's public keys:
// nobody else can make a valid call, so nobody can give themselves a doubleur.
// https://developers.google.com/admob/android/ssv

const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
// Google rotates its keys from time to time: they're read again after a day, or when an unknown key_id shows up
const KEYS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type VerifierKey = { keyId: number; pem: string };

let cachedKeys: VerifierKey[] = [];
let fetchedAt = 0;

// The query string cut in two: what Google signed (everything before "&signature="), and the signature + key id
export function splitSsvQuery(rawQuery: string) {
  const signatureAt = rawQuery.indexOf("&signature=");

  if (signatureAt === -1) {
    return null;
  }

  const message = rawQuery.slice(0, signatureAt);
  const params = new URLSearchParams(rawQuery.slice(signatureAt + 1));
  const signature = params.get("signature");
  const keyId = params.get("key_id");

  if (!signature || !keyId) {
    return null;
  }

  return { message, signature, keyId };
}

// Does this signature (web-safe base64, ECDSA SHA-256) match the message for this public key?
export function isValidSignature(message: string, signature: string, pem: string) {
  try {
    return crypto.verify("sha256", Buffer.from(message), pem, Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}

async function loadKeys(force: boolean) {
  if (!force && cachedKeys.length > 0 && Date.now() - fetchedAt < KEYS_MAX_AGE_MS) {
    return cachedKeys;
  }

  const response = await fetch(KEYS_URL);
  const data = (await response.json()) as { keys: VerifierKey[] };
  cachedKeys = data.keys;
  fetchedAt = Date.now();
  return cachedKeys;
}

// true only if Google signed this exact query string
export async function verifySsv(rawQuery: string) {
  const parts = splitSsvQuery(rawQuery);

  if (!parts) {
    return false;
  }

  let key = (await loadKeys(false)).find((item) => String(item.keyId) === parts.keyId);

  // A key we don't know yet: Google may have added one since our last read
  if (!key) {
    key = (await loadKeys(true)).find((item) => String(item.keyId) === parts.keyId);
  }

  return Boolean(key) && isValidSignature(parts.message, parts.signature, (key as VerifierKey).pem);
}
