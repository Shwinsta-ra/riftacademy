import React from "react";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { NavigationContainer, DefaultTheme, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "./src/screens/HomeScreen";
import QuizScreen from "./src/screens/QuizScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import StatsScreen from "./src/screens/StatsScreen";
import MatchListScreen from "./src/screens/MatchListScreen";
import MatchDetailScreen from "./src/screens/MatchDetailScreen";
import { FiltersProvider } from "./src/lib/filtersStore";
import { FeedbackProvider, useFeedback } from "./src/feedback/context";
import { FeedbackOverlay } from "./src/feedback/FeedbackBubble";
import { ROOT_ID } from "./src/feedback/capture";
import { theme } from "./src/lib/theme";

export type RootStackParamList = {
  Home: undefined;
  Quiz: undefined;
  Settings: undefined;
  Stats: undefined;
  MatchList: undefined;
  MatchDetail: { matchId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.bg,
    text: theme.text,
    border: theme.border,
    primary: theme.accent,
  },
};

// The default native-stack back button renders as an image asset
// (back-icon.png). That asset doesn't reliably resolve once deployed as a
// static web build (confirmed missing on the deployed Vercel build), so
// this replaces it with a plain text glyph that has no asset dependency at
// all — works identically on native and web.
function CustomBackButton() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;
  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
      <Text style={styles.backButtonText}>‹ Back</Text>
    </Pressable>
  );
}

// Split out so it can call useFeedback() — a component can't consume a context
// it renders itself.
function AppShell() {
  const { setRoute, clearScreenContext, trace } = useFeedback();

  return (
    // nativeID becomes a real DOM id on web. capture.web.ts screenshots this
    // element rather than document.body, so a desktop capture is the 480px app
    // column instead of the column adrift in empty page background.
    <View style={styles.webWrapper} nativeID={ROOT_ID}>
      <NavigationContainer
        theme={navTheme}
        onStateChange={(state) => {
          if (!state) return;
          const name = state.routes[state.index]?.name;
          if (!name) return;
          setRoute(name);
          // Drop the outgoing screen's context so a stale card id can't ride
          // along into a report filed from a different screen.
          clearScreenContext();
          trace("nav", name);
        }}
      >
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerLeft: () => <CustomBackButton />,
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerTransparent: false,
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Home", headerLeft: () => null }}
          />
          <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: "" }} />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Filters" }}
          />
          <Stack.Screen name="Stats" component={StatsScreen} options={{ title: "Progress" }} />
          <Stack.Screen
            name="MatchList"
            component={MatchListScreen}
            options={{ title: "Match Notes" }}
          />
          <Stack.Screen
            name="MatchDetail"
            component={MatchDetailScreen}
            options={{ title: "Match Log" }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Mounted once, here, rather than per screen — so every screen that
          exists today and every screen added later gets the button for free. */}
      <FeedbackOverlay />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FiltersProvider>
        <FeedbackProvider>
          <AppShell />
        </FeedbackProvider>
      </FiltersProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // On web, this caps the layout at a phone-like width and centers it, so a
  // desktop browser gets a clean column instead of the UI stretching across
  // the whole window. On native (iOS/Android) this is a no-op — phone
  // screens are already narrower than the cap, so it never actually
  // constrains anything there.
  webWrapper:
    Platform.OS === "web"
      ? { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" }
      : { flex: 1 },
  backButton: { paddingLeft: 8, paddingRight: 4, paddingVertical: 4 },
  backButtonText: { color: theme.accent, fontSize: 17, fontWeight: "500" },
});
