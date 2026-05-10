import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "") as string;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "") as string;

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
    // implicit flow works correctly with popup-based OAuth.
    // pkce requires sessionStorage shared between the opener and popup windows,
    // which browsers do not allow — causing silent token exchange failures.
    flowType: "implicit",
  },
});

export type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
