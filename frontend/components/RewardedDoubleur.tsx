import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { useRewardedAd } from "react-native-google-mobile-ads";

import type { RootState } from "../App";
import { REWARDED_UNIT_ID } from "../config/ads";
import { colors } from "../config/theme";
import { useAds } from "../utils/ads";

type Props = {
  leagueId: string;
  // The player's _id: it goes with the ad to Google, which sends it back signed to our server (/ads/reward)
  userId: string;
  // Called once the doubleur is granted: the BonusBar reads its stock again
  onReward: () => void;
};

// Google confirms the ad to our server a few seconds after it ends: the stock is read again after that
const REFRESH_DELAYS_MS = [3000, 8000];

// "Watch an ad (30 s) = +1 Doubleur this week, in this league" — the doubleur is granted by the server, not here
export default function RewardedDoubleur(props: Props) {
  const ads = useAds();

  // No ad is even created before consent (or if the player refused ads)
  if (!ads?.canRequestAds) {
    return null;
  }

  // Mounted only once consent is known: its request options are final from the start.
  // Changing them right after mount crashed the app ("ad has been destroyed"): the library
  // destroyed the first ad while still attaching its listener to it
  return <RewardedDoubleurButton {...props} nonPersonalizedOnly={ads.nonPersonalizedOnly} />;
}

function RewardedDoubleurButton({
  leagueId,
  userId,
  onReward,
  nonPersonalizedOnly,
}: Props & { nonPersonalizedOnly: boolean }) {
  const token = useSelector((state: RootState) => state.user.value.token);
  const [message, setMessage] = useState("");
  const handled = useRef(false);

  // useMemo: new request options would replace (and reload) the ad on every render
  const requestOptions = useMemo(
    () => ({
      serverSideVerificationOptions: { userId, customData: leagueId },
      requestNonPersonalizedAdsOnly: nonPersonalizedOnly,
    }),
    [userId, leagueId, nonPersonalizedOnly]
  );

  const { status, show, retry, earnedReward } = useRewardedAd({
    adUnitId: REWARDED_UNIT_ID,
    requestOptions,
  });

  // The ad was watched to the end
  useEffect(() => {
    if (!earnedReward || handled.current) {
      return;
    }

    handled.current = true;
    setMessage("Bien joué ! Ton Doubleur arrive…");

    // Google's TEST ads never call our server: in test mode the app asks for the doubleur itself
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/ads/config`)
      .then((response) => response.json())
      .then((config) => {
        if (!config.testRewards) {
          return;
        }

        return fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/ads/reward-test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, leagueId }),
        });
      })
      .catch(() => {})
      .finally(() => {
        REFRESH_DELAYS_MS.forEach((delay) => setTimeout(onReward, delay));
      });
  }, [earnedReward, leagueId, token, onReward]);

  if (message) {
    return <Text style={styles.message}>{message}</Text>;
  }

  if (status === "no-fill" || status === "error") {
    return (
      <TouchableOpacity style={styles.button} onPress={retry} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Pas de pub dispo pour l&apos;instant · Réessayer</Text>
      </TouchableOpacity>
    );
  }

  const isReady = status === "loaded";

  return (
    <View>
      <TouchableOpacity
        style={[styles.button, !isReady && styles.buttonDisabled]}
        onPress={() => show()}
        disabled={!isReady}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {isReady ? "🎬 Regarde une pub : +1 Doubleur cette semaine" : "Chargement de la pub…"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  message: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
});
