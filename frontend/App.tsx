import { StatusBar } from "expo-status-bar";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Ionicons } from "@expo/vector-icons";

import WelcomeScreen from "./screens/WelcomeScreen";
import SignUpScreen from "./screens/SignUpScreen";
import SignInScreen from "./screens/SignInScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import HomeScreen from "./screens/HomeScreen";
import LeaguesListScreen from "./screens/LeaguesListScreen";
import CreateLeagueScreen from "./screens/CreateLeagueScreen";
import LeagueScreen from "./screens/LeagueScreen";
import FootballPredictionScreen from "./screens/FootballPredictionScreen";
import OverUnderPredictionScreen from "./screens/OverUnderPredictionScreen";
import PodiumPredictionScreen from "./screens/PodiumPredictionScreen";
import RankingScreen from "./screens/RankingScreen";
import SabotageScreen from "./screens/SabotageScreen";
import ChatScreen from "./screens/ChatScreen";
import ResultScreen from "./screens/ResultScreen";
import GridsScreen from "./screens/GridsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import type { Prediction, SportEvent } from "./types";

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

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  CreateLeague: undefined;
  League: { leagueId: string; leagueName: string };
  FootballPrediction: { gridId: string; event: SportEvent; prediction?: Prediction; leagueId?: string };
  OverUnderPrediction: { gridId: string; event: SportEvent; prediction?: Prediction; leagueId?: string };
  PodiumPrediction: { gridId: string; event: SportEvent; prediction?: Prediction; leagueId?: string };
  Ranking: { leagueId: string; leagueName: string };
  Sabotage: { leagueId: string; targetUserId: string; targetUsername: string };
  Chat: { leagueId: string; leagueName: string };
  // Without a league: the general grid's results (no league rank)
  Result: { gridId: string; leagueId?: string; leagueName?: string };
};

export type TabParamList = {
  Accueil: undefined;
  Ligues: undefined;
  Grille: undefined;
  Profil: undefined;
};

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
      <Stack.Screen name="Ranking" component={RankingScreen} />
      <Stack.Screen name="Sabotage" component={SabotageScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}
