import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

import { BANNER_UNIT_ID } from "../config/ads";
import { useAds } from "../utils/ads";
import { useMe } from "../utils/useMe";

// An ad banner across the screen — never for VIP members (the client's rule: VIP = no ads),
// nor when the player refused ads, nor when there's no ad to show (no empty gap left behind)
export default function AdBanner() {
  const me = useMe();
  const ads = useAds();
  const [hasFailed, setHasFailed] = useState(false);

  // Wait for the profile: a VIP must never see a banner flash before we know
  if (!me || me.isVip || !ads?.canRequestAds || hasFailed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: ads.nonPersonalizedOnly }}
        onAdFailedToLoad={() => setHasFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 16,
  },
});
