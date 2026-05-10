import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useState, useRef, useEffect } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type FeatherName = ComponentProps<typeof Feather>["name"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AGENTS = [
  {
    icon: "search" as FeatherName,
    name: "Discovery Agent",
    desc: "Finds relevant companies based on your criteria",
    color: "#1D4ED8",
    bg: "#EFF6FF",
  },
  {
    icon: "bar-chart-2" as FeatherName,
    name: "Analysis Agent",
    desc: "Analyses digital presence and qualification score",
    color: "#7E22CE",
    bg: "#FAF5FF",
  },
  {
    icon: "mail" as FeatherName,
    name: "Outreach Agent",
    desc: "Writes hyper-personalised emails automatically",
    color: "#047857",
    bg: "#ECFDF5",
  },
];

const FEATURES_FINDX = [
  "Automatic lead discovery",
  "AI-driven analysis",
  "Hyper-personalised emails",
  "Real-time pipeline dashboard",
  "Fully automated",
  "Ready in < 60 seconds",
];

const FEATURES_MANUAL = [
  "Manual Google searching",
  "No analysis possible",
  "Generic email templates",
  "Managing spreadsheets",
  "Hours of work per lead",
  "Low conversion rate",
];

const TESTIMONIALS = [
  {
    quote: "FindX generated more qualified leads in one night than our team could find in a week.",
    name: "Lars van den Berg",
    role: "Head of Sales · Sendcloud",
    initials: "LB",
  },
  {
    quote: "The AI agents analyse every prospect in depth. Our emails now convert 3× better.",
    name: "Nadia Smit",
    role: "Growth Lead · Mollie",
    initials: "NS",
  },
];

function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"findx" | "manual">("findx");
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const handleSignIn = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  const testimonial = TESTIMONIALS[testimonialIdx];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 132 }}
      >
        {/* ─── HERO ─── */}
        <View style={[styles.heroSection, { paddingTop: insets.top + 32 }]}>
          <LinearGradient
            colors={["rgba(0,0,0,0.04)", "transparent"]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <FadeIn delay={0}>
            <View style={styles.badgeRow}>
              <View style={[styles.liveBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.liveDot} />
                <Text style={[styles.liveBadgeText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  AI AGENTS · ACTIVE
                </Text>
              </View>
            </View>
          </FadeIn>

          <FadeIn delay={100}>
            <View style={[styles.logoBox, { backgroundColor: colors.foreground }]}>
              <Text style={styles.logoText}>FX</Text>
            </View>
          </FadeIn>

          <FadeIn delay={180}>
            <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
              Automate your{"\n"}B2B Prospecting{"\n"}with AI Agents.
            </Text>
          </FadeIn>

          <FadeIn delay={260}>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              FindX deploys specialised AI agents to research prospects, analyse their digital presence, and write hyper-personalised emails — while you sleep.
            </Text>
          </FadeIn>

          <FadeIn delay={340}>
            <View style={styles.metricsRow}>
              {[
                { val: "500+", label: "Dutch companies" },
                { val: "3", label: "Specialised agents" },
                { val: "< 60s", label: "To first lead" },
              ].map((m, i) => (
                <View key={i} style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
                    {m.val}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          </FadeIn>
        </View>

        {/* ─── AGENTS ─── */}
        <FadeIn delay={400}>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              HOW IT WORKS
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
              Three Agents,{"\n"}One Pipeline
            </Text>
          </View>
        </FadeIn>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.agentScroll}
        >
          {AGENTS.map((agent, i) => (
            <FadeIn key={i} delay={420 + i * 60}>
              <View style={[styles.agentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.agentCardTop}>
                  <View style={[styles.agentIconBox, { backgroundColor: agent.bg }]}>
                    <Feather name={agent.icon} size={20} color={agent.color} />
                  </View>
                  <View style={[styles.agentNumBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.agentNum, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                      {i + 1}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.agentName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {agent.name}
                </Text>
                <Text style={[styles.agentDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {agent.desc}
                </Text>
              </View>
            </FadeIn>
          ))}
        </ScrollView>

        {/* ─── FEATURE COMPARISON ─── */}
        <FadeIn delay={600}>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              COMPARISON
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
              FindX vs{"\n"}Manual
            </Text>
          </View>

          <View style={styles.comparisonTabRow}>
            {(["findx", "manual"] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.comparisonTab,
                  {
                    backgroundColor: activeTab === tab
                      ? (tab === "findx" ? colors.foreground : colors.card)
                      : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.comparisonTabText,
                  {
                    color: activeTab === tab
                      ? (tab === "findx" ? colors.background : colors.foreground)
                      : colors.mutedForeground,
                    fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}>
                  {tab === "findx" ? "FindX ✓" : "Manual ✗"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.featureListCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(activeTab === "findx" ? FEATURES_FINDX : FEATURES_MANUAL).map((f, i) => (
              <View
                key={i}
                style={[
                  styles.featureRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <View style={[
                  styles.featureIcon,
                  { backgroundColor: activeTab === "findx" ? "#ECFDF5" : "#FEF2F2" },
                ]}>
                  <Feather
                    name={activeTab === "findx" ? "check" : "x"}
                    size={13}
                    color={activeTab === "findx" ? "#047857" : "#DC2626"}
                  />
                </View>
                <Text style={[
                  styles.featureText,
                  {
                    color: activeTab === "findx" ? colors.foreground : colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    textDecorationLine: activeTab === "manual" ? "line-through" : "none",
                  },
                ]}>
                  {f}
                </Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* ─── TESTIMONIAL ─── */}
        <FadeIn delay={700}>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              CUSTOMERS
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
              What Customers Say
            </Text>
          </View>

          <View style={[styles.testimonialCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Feather key={i} name="star" size={13} color="#F59E0B" />
              ))}
            </View>
            <Text style={[styles.testimonialQuote, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              "{testimonial.quote}"
            </Text>
            <View style={styles.testimonialAuthor}>
              <View style={[styles.testimonialAvatar, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.testimonialInitials, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {testimonial.initials}
                </Text>
              </View>
              <View>
                <Text style={[styles.testimonialName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {testimonial.name}
                </Text>
                <Text style={[styles.testimonialRole, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {testimonial.role}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.testimonialDots}>
            {TESTIMONIALS.map((_, i) => (
              <Pressable key={i} onPress={() => setTestimonialIdx(i)}>
                <View style={[
                  styles.dot,
                  { backgroundColor: i === testimonialIdx ? colors.foreground : colors.border },
                ]} />
              </Pressable>
            ))}
          </View>
        </FadeIn>

        {/* ─── PRICING ─── */}
        <FadeIn delay={800}>
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              PRICING
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
              Simple Pricing
            </Text>
          </View>

          <View style={styles.pricingRow}>
            {/* Starter */}
            <View style={[styles.pricingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.planName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Starter
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceAmount, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  €0
                </Text>
                <Text style={[styles.pricePer, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  /month
                </Text>
              </View>
              {["25 leads/month", "1 pipeline run", "Dashboard", "Email support"].map((f, i) => (
                <View key={i} style={styles.pricingFeatureRow}>
                  <Feather name="check" size={12} color="#047857" />
                  <Text style={[styles.pricingFeatureText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>

            {/* Pro */}
            <View style={[styles.pricingCard, styles.pricingCardPro, { backgroundColor: colors.foreground }]}>
              <View style={styles.popularBadge}>
                <Text style={[styles.popularBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                  Popular
                </Text>
              </View>
              <Text style={[styles.planName, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
                Pro
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceAmount, { color: colors.background, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  €49
                </Text>
                <Text style={[styles.pricePer, { color: `${colors.background}99`, fontFamily: "Inter_400Regular" }]}>
                  /month
                </Text>
              </View>
              {["Unlimited leads", "Unlimited runs", "AI analysis", "Outreach agents", "Priority support"].map((f, i) => (
                <View key={i} style={styles.pricingFeatureRow}>
                  <Feather name="check" size={12} color="#86EFAC" />
                  <Text style={[styles.pricingFeatureText, { color: `${colors.background}CC`, fontFamily: "Inter_400Regular" }]}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={[styles.pricingNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            No credit card required · Cancel anytime
          </Text>
        </FadeIn>
      </ScrollView>

      {/* ─── STICKY SIGN-IN FOOTER ─── */}
      <View style={[
        styles.stickyFooter,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + 16,
        },
      ]}>
        <Pressable
          onPress={handleSignIn}
          disabled={loading}
          style={({ pressed }) => [
            styles.googleBtn,
            {
              backgroundColor: pressed ? colors.muted : colors.foreground,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          testID="google-signin-btn"
        >
          {loading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={[styles.googleBtnText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
                Get started free with Google
              </Text>
              <Feather name="arrow-right" size={16} color={colors.background} />
            </>
          )}
        </Pressable>
        <Text style={[styles.footerNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          FindX · Authorized users only
        </Text>
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleIconText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  heroSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "flex-start",
    gap: 16,
  },
  badgeRow: { flexDirection: "row" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  liveBadgeText: { fontSize: 11, letterSpacing: 0.5 },

  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  logoText: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  heroTitle: { fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, lineHeight: 23, color: "#6B7280" },

  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 },
  metricItem: { gap: 2 },
  metricVal: { fontSize: 22 },
  metricLabel: { fontSize: 11 },

  sectionWrap: { paddingHorizontal: 24, marginBottom: 16, marginTop: 32 },
  sectionEyebrow: { fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  sectionTitle: { fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },

  agentScroll: { paddingHorizontal: 24, gap: 12, paddingBottom: 4 },
  agentCard: {
    width: SCREEN_WIDTH * 0.78,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  agentCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  agentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  agentNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  agentNum: { fontSize: 13 },
  agentName: { fontSize: 15 },
  agentDesc: { fontSize: 13, lineHeight: 19 },

  comparisonTabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  comparisonTab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  comparisonTabText: { fontSize: 14 },
  featureListCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 14, flex: 1 },

  testimonialCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  starsRow: { flexDirection: "row", gap: 3 },
  testimonialQuote: { fontSize: 15, lineHeight: 23, fontStyle: "italic" },
  testimonialAuthor: { flexDirection: "row", alignItems: "center", gap: 12 },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialInitials: { fontSize: 14 },
  testimonialName: { fontSize: 14 },
  testimonialRole: { fontSize: 12 },
  testimonialDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },

  pricingRow: {
    flexDirection: "column",
    gap: 12,
    paddingHorizontal: 24,
  },
  pricingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  pricingCardPro: {
    borderWidth: 0,
    position: "relative",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  popularBadgeText: { fontSize: 10, color: "#000" },
  planName: { fontSize: 14, marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginBottom: 8 },
  priceAmount: { fontSize: 30 },
  pricePer: { fontSize: 12, paddingBottom: 4 },
  pricingFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pricingFeatureText: { fontSize: 12, flex: 1 },
  pricingNote: { textAlign: "center", fontSize: 12, marginTop: 12, paddingHorizontal: 24 },

  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    minHeight: 54,
  },
  googleBtnText: { fontSize: 15, flexShrink: 1, textAlign: "center" },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: { color: "white", fontSize: 13, fontWeight: "700" },
  footerNote: { fontSize: 11, textAlign: "center" },
});
