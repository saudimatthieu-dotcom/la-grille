import { load, send, type Token } from "./api";

// Rewarded ads (backend routes/ads.ts)

// { testRewards }: are we in test mode?
export function loadAdsConfig() {
  return load("/ads/config");
}

// Google's TEST ads never call our server: in test mode the app asks for the doubleur itself
export function claimTestReward(body: { token: Token; leagueId: string }) {
  return send("POST", "/ads/reward-test", body);
}
