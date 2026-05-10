import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(tabs)");
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Signing you in...</Text>
    </View>
  );
}