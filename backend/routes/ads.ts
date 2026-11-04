import express from "express";
import uid2 from "uid2";

import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { verifySsv } from "../modules/admobSsv";
import { grantAdReward } from "../modules/adRewards";

const router = express.Router();

// GET /ads/reward — called by Google (not by the app) when a player has watched a rewarded ad to the end.
// The URL is set on the rewarded ad unit in the AdMob console ("Server-side verification").
// user_id = the player's _id, custom_data = the league's _id (both set by the app when it loads the ad)
router.get("/reward", async (req, res) => {
  // The raw query string, exactly as Google signed it (req.query is already decoded)
  const rawQuery = req.originalUrl.slice(req.originalUrl.indexOf("?") + 1);

  try {
    if (!(await verifySsv(rawQuery))) {
      res.status(403).json({ result: false, error: "Invalid signature" });
      return;
    }
  } catch {
    // Google's keys couldn't be read: an error status, so the call shows as failed in AdMob
    res.status(503).json({ result: false, error: "Could not check the signature" });
    return;
  }

  const userId = String(req.query.user_id ?? "");
  const leagueId = String(req.query.custom_data ?? "");
  const transactionId = String(req.query.transaction_id ?? "");

  // The AdMob console's "Verify URL" button sends a signed call without player: it only checks we answer
  if (!userId || !leagueId) {
    res.json({ result: true, granted: false });
    return;
  }

  const error = await grantAdReward(userId, leagueId, transactionId);

  // 200 even when refused (limit reached…): the signature was fine, Google has nothing to retry
  res.json({ result: true, granted: error === null, error });
});

// POST /ads/reward-test — the same doubleur without Google, for Google's TEST ads (they never call /ads/reward).
// Off unless ADS_TEST_REWARDS=true on the server: never leave it on once real ads are live
router.post("/reward-test", async (req, res) => {
  if (process.env.ADS_TEST_REWARDS !== "true") {
    res.json({ result: false, error: "Test rewards are off" });
    return;
  }

  if (!checkBody(req.body, ["token", "leagueId"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const user = await User.findOne({ token: String(req.body.token) });

  if (!user) {
    res.json({ result: false, error: "User not found" });
    return;
  }

  const error = await grantAdReward(String(user._id), String(req.body.leagueId), `test-${uid2(16)}`);
  res.json(error ? { result: false, error } : { result: true });
});

// Whether the app should call /ads/reward-test after a test ad (it can't read the server's .env)
router.get("/config", (req, res) => {
  res.json({ result: true, testRewards: process.env.ADS_TEST_REWARDS === "true" });
});

export default router;
