import { useEffect, useState } from "react";
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
} from "react-native-google-mobile-ads";

// What the ads may do once started
export type AdsState = {
  // false: the player refused ads in the consent form (or ads failed to start) — no ad is requested
  canRequestAds: boolean;
  // true: no consent form could be shown (AdMob's GDPR message isn't set up yet) → non-personalised ads only
  nonPersonalizedOnly: boolean;
};

let starting: Promise<AdsState> | null = null;

// Starts ads once for the whole app: consent first (required in Europe), then the content rules, then the SDK
async function start(): Promise<AdsState> {
  let nonPersonalizedOnly = false;
  let canRequestAds = true;

  try {
    // Google's consent form (UMP): shown only when needed — first launch in Europe, or consent expired
    const info = await AdsConsent.gatherConsent();
    canRequestAds = info.canRequestAds;
  } catch {
    // No consent message configured in AdMob yet (test app id): we don't ask, so nothing personalised
    nonPersonalizedOnly = true;
  }

  if (!canRequestAds) {
    return { canRequestAds: false, nonPersonalizedOnly };
  }

  try {
    // PG: no adult content (the client's rule). Betting, dating, etc. are blocked in the AdMob console
    // (Blocking controls → Sensitive categories) — that can't be done from the code
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    return { canRequestAds: true, nonPersonalizedOnly };
  } catch {
    return { canRequestAds: false, nonPersonalizedOnly };
  }
}

export function startAds() {
  starting ??= start();
  return starting;
}

// null while ads are starting (the consent form may be on screen), then what they may do
export function useAds() {
  const [ads, setAds] = useState<AdsState | null>(null);

  useEffect(() => {
    let isMounted = true;

    startAds().then((state) => {
      if (isMounted) {
        setAds(state);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return ads;
}

// Profil's "Gérer mes choix de pub" link: Google requires it wherever the consent form applies (Europe)
export function useAdPrivacyOptions() {
  const [isRequired, setIsRequired] = useState(false);

  useEffect(() => {
    startAds()
      .then(() => AdsConsent.getConsentInfo())
      .then((info) =>
        setIsRequired(info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED)
      )
      .catch(() => setIsRequired(false));
  }, []);

  return {
    isRequired,
    open: () => AdsConsent.showPrivacyOptionsForm().catch(() => {}),
  };
}
