import { StatusBar } from "expo-status-bar";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Ionicons } from "@expo/vector-icons";

import WelcomeScreen from "./screens/WelcomeScreen";
import SignUpScreen from "./screens/SignUpScreen";
import SignInScreen from "./screens/SignInScreen";
import HomeScreen from "./screens/HomeScreen";

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
  MainTabs: undefined;
};

export type TabParamList = {
  Accueil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// -------------------------- TAB NAVIGATOR -------------------------

const TAB_ICONS = {
  Accueil: "home-outline",
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
      <Stack.Screen name="MainTabs" component={MainTabs} />
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
