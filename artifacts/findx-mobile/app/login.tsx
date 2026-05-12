import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const { width: W, height: H } = Dimensions.get("window");

// ── Agent preview cards ────────────────────────────────────────────────────

const AGENTS = [
  {
    icon: "search" as const,
    title: "Discovery Agent",
    desc: "Finds local businesses that need your services.",
    color: "#60A5FA",
    bg: "rgba(59,130,246,0.12)",
  },
  {
    icon: "bar-chart-2" as const,
    title: "Analysis Agent",
    desc: "Scores leads and surfaces growth opportunities.",
    color: "#C084FC",
    bg: "rgba(168,85,247,0.12)",
  },
  {
    icon: "mail" as const,
    title: "Outreach Agent",
    desc: "Crafts personalised emails and tracks replies.",
    color: "#34D399",
    bg: "rgba(16,185,129,0.12)",
  },
];

// ── Floating orb decorations ───────────────────────────────────────────────

function FloatingOrb({
  x,
  y,
  size,
  color,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 3200 + delay }),
        withTiming(18, { duration: 3200 + delay }),
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.18,
          filter: Platform.OS === "web" ? `blur(${size * 0.5}px)` : undefined,
        },
        style,
      ]}
    />
  );
}

// ── Main Login Screen ──────────────────────────────────────────────────────

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, loading, user } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = React.useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  const bgGradientColors = colors.isDark
    ? (["#080810", "#0D0C1E", "#12102A"] as const)
    : (["#E8E6F4", "#F0EFF8", "#F5F4FC"] as const);

  return (
    <LinearGradient
      colors={bgGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      {/* Floating orbs */}
      <FloatingOrb x={-40}   y={80}  size={220} color="#F59E0B" delay={0}   />
      <FloatingOrb x={W-100} y={H*0.35} size={180} color="#818CF8" delay={500} />
      <FloatingOrb x={40}    y={H*0.65} size={160} color="#60A5FA" delay={800} />
      <FloatingOrb x={W-60}  y={H*0.75} size={140} color="#C084FC" delay={300} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(700)} style={styles.header}>
          <View style={styles.logoRow}>
            <LinearGradient
              colors={[colors.brandGradientStart, colors.brandGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoMark}
            >
              <Feather name="search" size={22} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.logoText, { color: colors.foreground }]}>FindX</Text>
          </View>
          <Text style={[styles.tagline, { color: colors.brand }]}>
            AI-Powered Lead Generation
          </Text>
        </Animated.View>

        {/* Hero text */}
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Find Your Next{"\n"}Best Customer
          </Text>
          <Text style={[styles.heroSub, { color: colors.foregroundMuted }]}>
            Three AI agents work together to discover leads,{"\n"}
            analyse opportunities, and send personalised outreach.
          </Text>
        </Animated.View>

        {/* Agent cards */}
        <Animated.View entering={FadeInDown.delay(350).duration(700)} style={styles.agentCards}>
          {AGENTS.map((agent, i) => (
            <Animated.View
              key={agent.title}
              entering={FadeInDown.delay(400 + i * 100).duration(600)}
            >
              {Platform.OS === "ios" ? (
                <BlurView
                  intensity={18}
                  tint={colors.isDark ? "dark" : "light"}
                  style={[
                    styles.agentCard,
                    {
                      borderColor: colors.glassBorder,
                      borderWidth: 1,
                      overflow: "hidden",
                    },
                  ]}
                >
                  <AgentCardContent agent={agent} colors={colors} />
                </BlurView>
              ) : (
                <View
                  style={[
                    styles.agentCard,
                    {
                      backgroundColor: colors.glassBackground,
                      borderColor: colors.glassBorder,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <AgentCardContent agent={agent} colors={colors} />
                </View>
              )}
            </Animated.View>
          ))}
        </Animated.View>

        {/* Sign in button */}
        <Animated.View entering={FadeInUp.delay(600).duration(700)} style={styles.ctaSection}>
          <Pressable
            onPress={handleSignIn}
            disabled={signingIn || loading}
            style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
          >
            <LinearGradient
              colors={[colors.brandGradientStart, colors.brandGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInButton}
            >
              {signingIn || loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.signInText}>Continue with Google</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={[styles.legalText, { color: colors.foregroundSubtle }]}>
            By signing in you agree to our{" "}
            <Text style={{ color: colors.brand }}>Terms of Service</Text>
            {" "}and{" "}
            <Text style={{ color: colors.brand }}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

function AgentCardContent({
  agent,
  colors,
}: {
  agent: (typeof AGENTS)[number];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.agentCardInner}>
      <View style={[styles.agentIconWrap, { backgroundColor: agent.bg }]}>
        <Feather name={agent.icon} size={18} color={agent.color} />
      </View>
      <View style={styles.agentText}>
        <Text style={[styles.agentTitle, { color: colors.foreground }]}>{agent.title}</Text>
        <Text style={[styles.agentDesc, { color: colors.foregroundMuted }]}>{agent.desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 32 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tagline: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  heroSection: { alignItems: "center", marginBottom: 36 },
  heroTitle: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 14,
  },
  heroSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  agentCards: { gap: 12, marginBottom: 40 },
  agentCard: { borderRadius: 16 },
  agentCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  agentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  agentText: { flex: 1 },
  agentTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  agentDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  ctaSection: { alignItems: "center", gap: 16 },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 32,
    minWidth: 280,
  },
  googleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  signInText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  legalText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
