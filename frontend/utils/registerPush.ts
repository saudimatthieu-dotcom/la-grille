import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Asks permission, gets this phone's Expo push token and saves it on my account (PUT /users/me/push-token)
// Same code for Android and iPhone: Expo's push service talks to Firebase (Android) or Apple (iOS) for us
// Never throws: if push fails, the app keeps working without notifications
export async function registerPush(token: string): Promise<void> {
  // An emulator / iOS simulator can't get a push token
  if (!Device.isDevice) {
    return;
  }

  try {
    // Android 8+ only shows notifications that belong to a channel (iOS has no channels)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // Asks only the first time: after that, the phone remembers the answer
    let { status } = await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      // iOS asks for each kind separately: banner, badge on the icon, sound
      ({ status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }));
    }

    if (status !== "granted") {
      return;
    }

    // The EAS project id (app.json → extra.eas.projectId) tells Expo which app the token belongs to
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    // Copy it into expo.dev/notifications to send a test push
    console.log("Expo push token:", pushToken);

    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_ADRESS}/users/me/push-token`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      // platform: "android" or "ios" — the backend accepts both
      body: JSON.stringify({ token, pushToken, platform: Platform.OS }),
    });
    const data = await response.json();

    if (!data.result) {
      console.log("Push token not saved:", data.error);
    }
  } catch (error) {
    // e.g. in Expo Go on Android (no remote push since SDK 53), or iOS without push credentials
    console.log("Push registration failed:", error);
  }
}
