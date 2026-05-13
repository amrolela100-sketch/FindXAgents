import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when the required Supabase env vars are missing */
export const isSupabaseMisconfigured = !supabaseUrl || !supabaseAnonKey;

// Lazy client — only created when the vars are present.
// If vars are missing the app shows a config-error banner (see App.tsx)
// instead of crashing with an unhandled error on import.
let _client: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      if (!supabaseUrl || !supabaseAnonKey) {
        // Return a no-op for auth methods so callers don't throw before the banner renders
        if (prop === "auth") {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signOut: async () => ({}),
          };
        }
        return undefined;
      }
      _client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      });
    }
    return (_client as any)[prop];
  },
});

export type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];
