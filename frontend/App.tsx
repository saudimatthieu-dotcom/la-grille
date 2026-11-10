import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";

import { NavigationContainer, StackActions, createNavigationContainerRef } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Ionicons } from "@expo/vector-icons";

import WelcomeScreen from "./pages/WelcomeScreen";
import SignUpScreen from "./pages/SignUpScreen";
import SignInScreen from "./pages/SignInScreen";
import ForgotPasswordScreen from "./pages/ForgotPasswordScreen";
import HomeScreen from "./pages/HomeScreen";
import LeaguesListScreen from "./pages/LeaguesListScreen";
import CreateLeagueScreen from "./pages/CreateLeagueScreen";
import LeagueScreen from "./pages/LeagueScreen";
import FootballPredictionScreen from "./pages/FootballPredictionScreen";
import OverUnderPredictionScreen from "./pages/OverUnderPredictionScreen";
import PodiumPredictionScreen from "./pages/PodiumPredictionScreen";
import SabotageScreen from "./pages/SabotageScreen";
import ResultScreen from "./pages/ResultScreen";
import GridsScreen from "./pages/GridsScreen";
import ProfileScreen from "./pages/ProfileScreen";
import StatsScreen from "./pages/StatsScreen";
import VipScreen from "./pages/VipScreen";
import AdminScreen from "./pages/AdminScreen";
import PicksScreen from "./pages/PicksScreen";
import type { LeagueTab, Prediction, SportEvent } from "./types";

import { Provider, useSelector } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import user from "./reducers/user";

import { colors } from "./config/theme";

const reducers = combineReducers({ user });
const persistConfig = { key: "la-grille", storage: AsyncStorage };

const store = configureStore({
  reducer: persistReducer(persistConfig, reducers),
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;

// Without this, a notification that arrives while the app is open is not shown
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  // screen: the tab to open — e.g. Grille when a game notification is tapped
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  CreateLeague: undefined;
  // tab: the tab to open (Grille by default) — e.g. the chat from the home screen news
  League: { leagueId: string; leagueName: string; tab?: LeagueTab };
  FootballPrediction: { gridId: string; event: SportEvent; prediction?: Prediction; leagueId?: string };
  OverUnderPrediction: { gridId: string; event: SportEvent; prediction?: Prediction; leagueId?: string };
  PodiumPrediction: { gridId: string; event: SportEvent; prediction?: Prediction; leagueId?: string };
  Sabotage: { leagueId: string; targetUserId: string; targetUsername: string };
  // Without a league: the general grid's results (no league rank)
  Result: { gridId: string; leagueId?: string; leagueName?: string };
  Stats: undefined;
  Vip: undefined;
  Admin: undefined;
  // With a league: its VIP owner picks its matches (sur-mesure) — without: an admin picks the grid types' matches
  Picks: { leagueId?: string; leagueName?: string };
};

export type TabParamList = {
  Accueil: undefined;
  Ligues: undefined;
  Grille: undefined;
  Profil: undefined;
};

// Lets code outside the screens navigate — here, a tapped notification
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// -------------------------- TAB NAVIGATOR -------------------------

const TAB_ICONS = {
  Accueil: "home-outline",
  Ligues: "trophy-outline",
  Grille: "grid-outline",
  Profil: "person-outline",
} as const;

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.card },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen
        name="Ligues"
        component={LeaguesListScreen}
        options={{ tabBarLabel: "Mes Ligues" }}
      />
      <Tab.Screen name="Grille" component={GridsScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// -------------------------- ROOT STACK -------------------------

function RootNavigator() {
  const token = useSelector((state: RootState) => state.user.value.token);

  return (
    <Stack.Navigator
      initialRouteName={token ? "MainTabs" : "Welcome"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="CreateLeague" component={CreateLeagueScreen} />
      <Stack.Screen name="League" component={LeagueScreen} />
      <Stack.Screen name="FootballPrediction" component={FootballPredictionScreen} />
      <Stack.Screen name="OverUnderPrediction" component={OverUnderPredictionScreen} />
      <Stack.Screen name="PodiumPrediction" component={PodiumPredictionScreen} />
      <Stack.Screen name="Sabotage" component={SabotageScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="Vip" component={VipScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="Picks" component={PicksScreen} />
    </Stack.Navigator>
  );
}

// -------------------------- NOTIFICATION TAP -------------------------

// A tapped notification opens its screen — also when the tap launched the app:
// a chat message → that league's Chat tab, a game notification → the Grille tab
function NotificationTapHandler({ isNavigationReady }: { isNavigationReady: boolean }) {
  const token = useSelector((state: RootState) => state.user.value.token);
  const response = Notifications.useLastNotificationResponse();
  // The hook gives the same tap back on every render: each notification is handled once
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!isNavigationReady || !token || !response) {
      return;
    }

    const id = response.notification.request.identifier;

    if (handledId.current === id || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }

    handledId.current = id;
    // Otherwise the next launch would open the same chat again
    Notifications.clearLastNotificationResponse();

    const data = response.notification.request.content.data;

    if (data?.kind === "message" && typeof data.leagueId === "string") {
      // push (not navigate): opens the chat even when another league's screen is already open
      navigationRef.dispatch(
        StackActions.push("League", { leagueId: data.leagueId, leagueName: String(data.leagueName ?? ""), tab: "chat" })
      );
      return;
    }

    // New grid, closing soon, results: the week's grid, in the Grille tab
    if (data?.kind === "newGrid" || data?.kind === "closingSoon" || data?.kind === "results") {
      navigationRef.navigate("MainTabs", { screen: "Grille" });
    }
  }, [isNavigationReady, token, response]);

  return null;
}

export default function App() {
  // A notification can only open a screen once the navigator exists
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <NavigationContainer ref={navigationRef} onReady={() => setIsNavigationReady(true)}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
        <NotificationTapHandler isNavigationReady={isNavigationReady} />
      </PersistGate>
    </Provider>
  );
}
