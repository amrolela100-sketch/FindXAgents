import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { router } from "expo-router";
import { supabase, type SupabaseUser } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: SupabaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getRedirectUrl(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/`;
    }
    const expoDomain = process.env.EXPO_PUBLIC_EXPO_DEV_DOMAIN;
    if (expoDomain) return `https://${expoDomain}/`;
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}/`;
    return "/";
  }
  return Linking.createURL("auth/callback");
}

async function goToDashboard() {
  try {
    router.replace("/(tabs)");
  } catch {
    router.replace("/");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const waitingForAuth = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        waitingForAuth.current = false;
      }
    });

    // ── Cross-window session sync (web popup flow) ─────────────────
    let storageHandler: ((e: StorageEvent) => Promise<void>) | null = null;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      storageHandler = async (e: StorageEvent) => {
        if (e.key && (e.key.includes("auth-token") || e.key.includes("supabase"))) {
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user ?? null);
        }
      };
      window.addEventListener("storage", storageHandler);
    }

    // ── Native: AppState listener for Expo Go auth recovery ──────────
    // When user comes back to the app from the browser (Google OAuth),
    // we poll for the session because the deep-link redirect may not fire.
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        Platform.OS !== "web" &&
        waitingForAuth.current &&
        prevState.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // App came back to foreground while we were waiting for auth
        // Retry a few times to give Supabase time to store the session
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 600));
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            waitingForAuth.current = false;
            setUser(data.session.user);
            await goToDashboard();
            return;
          }
        }
      }
    };

    const appStateSub = AppState.addEventListener("change", handleAppStateChange);

    // ── Native: Deep link listener for successful OAuth redirect ──────
    let linkingSub: ReturnType<typeof Linking.addEventListener> | null = null;
    if (Platform.OS !== "web") {
      linkingSub = Linking.addEventListener("url", async ({ url }) => {
        if (!url) return;
        // Extract tokens from the URL (hash fragment or query params)
        const parsed = new URL(url);
        const fragment = parsed.hash ? parsed.hash.substring(1) : parsed.search.substring(1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session?.user) {
            waitingForAuth.current = false;
            setUser(data.session.user);
            await goToDashboard();
          }
        } else {
          // No tokens in URL — check if session was stored anyway
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            waitingForAuth.current = false;
            setUser(data.session.user);
            await goToDashboard();
          }
        }
      });
    }

    return () => {
      listener.subscription.unsubscribe();
      if (storageHandler) window.removeEventListener("storage", storageHandler);
      appStateSub.remove();
      linkingSub?.remove();
    };
  }, []);

  const signInWithGoogle = async () => {
    const redirectTo = getRedirectUrl();

    // ── Web ──────────────────────────────────────────────────────────
    if (Platform.OS === "web") {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return;

      const popup = window.open(
        data.url,
        "google-oauth",
        "width=520,height=620,left=200,top=100,toolbar=0,menubar=0,location=0"
      );

      if (!popup) {
        (window.top ?? window).location.href = data.url;
      }
      return;
    }

    // ── Native (iOS / Android / Expo Go) ────────────────────────────
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: true,
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error || !data.url) return;

    // Mark that we're waiting for auth — AppState listener will check
    waitingForAuth.current = true;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    });

    if (result.type === "success" && result.url) {
      const parsed = new URL(result.url);
      const fragment = parsed.hash ? parsed.hash.substring(1) : parsed.search.substring(1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!sessionError && sessionData.session?.user) {
          waitingForAuth.current = false;
          setUser(sessionData.session.user);
          await goToDashboard();
          return;
        }
      }

      // Try getSession as fallback
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (sessionCheck.session?.user) {
        waitingForAuth.current = false;
        setUser(sessionCheck.session.user);
        await goToDashboard();
        return;
      }
    }

    // For dismiss or cancel — check if session was stored anyway
    // (happens on some Android devices where the browser stores the token
    // before closing)
    if (result.type === "dismiss" || result.type === "cancel") {
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (sessionCheck.session?.user) {
        waitingForAuth.current = false;
        setUser(sessionCheck.session.user);
        await goToDashboard();
        return;
      }
      // AppState listener will continue polling when app comes to foreground
    }
  };

  const signOut = async () => {
    waitingForAuth.current = false;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
