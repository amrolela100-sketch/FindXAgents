import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_600SemiBold,
} from "@expo-google-fonts/playfair-display";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { getOnboardingStatus } from "@/lib/api";

SplashScreen.preventAutoHideAsync();

if (Platform.OS === "web" && typeof window !== "undefined" && window.opener) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
      window.close();
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true);
  useRealtimeSync();

  useEffect(() => {
    if (loading) return;

    const inLoginScreen = segments[0] === "login";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      setOnboardingChecked(true);
      if (!inLoginScreen) router.replace("/login");
      return;
    }

    // User is logged in — check onboarding
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.onboarding_completed) {
      setOnboardingDone(true);
      setOnboardingChecked(true);
      if (inLoginScreen || inOnboarding) router.replace("/");
      return;
    }

    getOnboardingStatus()
      .then((data) => {
        const done = data.completed === true;
        setOnboardingDone(done);
        setOnboardingChecked(true);
        if (!done && !inOnboarding) {
          router.replace("/onboarding");
        } else if (done && (inLoginScreen || inOnboarding)) {
          router.replace("/");
        }
      })
      .catch(() => {
        setOnboardingDone(true);
        setOnboardingChecked(true);
        if (inLoginScreen) router.replace("/");
      });
  }, [user, loading, segments]);

  if (!onboardingChecked && user) return null;

  return <>{children}</>;
}

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lead/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="run/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <AuthGate>
                  <RootLayoutNav />
                </AuthGate>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
