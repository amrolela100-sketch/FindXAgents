import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

// LOW-15: Allowed redirect targets after OAuth callback.
// Only these tab routes are valid — prevents open-redirect abuse if a
// crafted deep-link injects an arbitrary `next` param.
const ALLOWED_REDIRECTS = new Set([
  "/(tabs)",
  "/(tabs)/leads",
  "/(tabs)/agents",
  "/(tabs)/runs",
  "/(tabs)/profile",
]);

function isSafeRedirect(target: string | undefined): target is string {
  if (!target) return false;
  // Must start with / and be in the explicit allowlist
  return target.startsWith("/") && ALLOWED_REDIRECTS.has(target);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  // `next` may be passed as a deep-link query param, e.g.
  // findx://auth/callback?next=%2F(tabs)%2Fleads
  const { next } = useLocalSearchParams<{ next?: string }>();

  useEffect(() => {
    // LOW-15: validate redirect before navigating — never follow arbitrary URLs
    const destination = isSafeRedirect(next) ? next : "/(tabs)";
    router.replace(destination as any);
  }, [router, next]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Signing you in…</Text>
    </View>
  );
}
