import { TestIds } from "react-native-google-mobile-ads";

// The ad units (AdMob console → Apps → La Grille → Ad units), set in .env / the EAS "preview" environment.
// Until they exist — and always in development, so we never click our own real ads (AdMob bans that) —
// Google's TEST ads are shown: "Test Ad" banners and test videos.
// ⚠️ The app ids in app.json are Google's test app ids too: replace them with La Grille's before real ads.
export const BANNER_UNIT_ID = (!__DEV__ && process.env.EXPO_PUBLIC_ADMOB_BANNER_ID) || TestIds.ADAPTIVE_BANNER;
export const REWARDED_UNIT_ID = (!__DEV__ && process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID) || TestIds.REWARDED;
