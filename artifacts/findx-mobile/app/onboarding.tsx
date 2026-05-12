import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
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
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { completeOnboarding } from "@/lib/api";

const { width: W } = Dimensions.get("window");

// ── Onboarding steps ───────────────────────────────────────────────────────

const STEPS = [
  {
    icon: "search" as const,
    title: "Discover Leads",
    subtitle: "AI finds businesses that match your ideal customer profile",
    description:
      "Describe the type of business you're looking for — location, industry, or specific pain points — and the Discovery Agent will search for matching leads automatically.",
    color: "#60A5FA",
    bg: "rgba(59,130,246,0.12)",
    gradientStart: "#3B82F6",
    gradientEnd: "#6366F1",
  },
  {
    icon: "bar-chart-2" as const,
    title: "AI Analysis",
    subtitle: "Every lead is scored and ranked by opportunity",
    description:
      "The Analysis Agent reviews each business's web presence, reviews, and digital footprint to assign a lead score and surface the strongest opportunities.",
    color: "#C084FC",
    bg: "rgba(168,85,247,0.12)",
    gradientStart: "#A855F7",
    gradientEnd: "#EC4899",
  },
  {
    icon: "mail" as const,
    title: "Smart Outreach",
    subtitle: "Personalised emails written and sent by AI",
    description:
      "The Outreach Agent drafts a unique email for each lead, referencing their specific situation. Approve with one tap and watch your inbox fill with replies.",
    color: "#34D399",
    bg: "rgba(16,185,129,0.12)",
    gradientStart: "#10B981",
    gradientEnd: "#14B8A6",
  },
  {
    icon: "zap" as const,
    title: "You're All Set",
    subtitle: "Start your first run to find your next customers",
    description:
      "The whole pipeline runs in the background. Get notified when leads are ready to review, and close more deals with less effort.",
    color: "#FBBF24",
    bg: "rgba(245,158,11,0.12)",
    gradientStart: "#F59E0B",
    gradientEnd: "#F97316",
  },
];

// ── Step card ──────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  active,
}: {
  step: (typeof STEPS)[number];
  index: number;
  active: boolean;
}) {
  const colors = useColors();

  return (
    <View style={[styles.stepSlide, { width: W - 32 }]}>
      <Animated.View entering={FadeInDown.delay(active ? 100 : 0).duration(500)}>
        {/* Icon */}
        <LinearGradient
          colors={[step.gradientStart, step.gradientEnd]}
          style={styles.stepIcon}
        >
          <Feather name={step.icon} size={36} color="#FFF" />
        </LinearGradient>

        {/* Step indicator */}
        <View style={[styles.stepNumber, { backgroundColor: step.bg }]}>
          <Text style={[styles.stepNumberText, { color: step.color }]}>
            Step {index + 1} of {STEPS.length}
          </Text>
        </View>

        {/* Text */}
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
        <Text style={[styles.stepSubtitle, { color: step.color }]}>{step.subtitle}</Text>
        <Text style={[styles.stepDesc, { color: colors.foregroundMuted }]}>{step.description}</Text>

        {/* Feature chips */}
        <View style={styles.featureChips}>
          {getStepFeatures(index).map((f) => (
            <View key={f} style={[styles.featureChip, { backgroundColor: step.bg, borderColor: `${step.color}30` }]}>
              <Feather name="check" size={11} color={step.color} />
              <Text style={[styles.featureChipText, { color: step.color }]}>{f}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function getStepFeatures(index: number): string[] {
  switch (index) {
    case 0: return ["Google Maps data", "Local business search", "Auto-dedup"];
    case 1: return ["Website audit", "Lead scoring 0-100", "Opportunity analysis"];
    case 2: return ["Personalised emails", "One-tap approval", "Reply tracking"];
    case 3: return ["Background processing", "Push notifications", "Full pipeline"];
    default: return [];
  }
}

// ── Onboarding Screen ──────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const isLast = currentStep === STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) {
      setLoading(true);
      try {
        await completeOnboarding({});
      } catch (_) {}
      router.replace("/(tabs)");
      return;
    }
    const next = currentStep + 1;
    setCurrentStep(next);
    scrollRef.current?.scrollTo({ x: (W - 32) * next + next * 16, animated: true });
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await completeOnboarding({});
    } catch (_) {}
    router.replace("/(tabs)");
  };

  const bgColors = colors.isDark
    ? (["#080810", "#0D0C1E", "#12102A"] as const)
    : (["#E8E6F4", "#F0EFF8", "#F5F4FC"] as const);

  return (
    <LinearGradient colors={bgColors} style={styles.root}>
      {/* Skip button */}
      <Pressable
        onPress={handleSkip}
        style={[styles.skipBtn, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[styles.skipText, { color: colors.foregroundMuted }]}>Skip</Text>
      </Pressable>

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        {/* Slides */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={W - 32 + 16}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.slides}
          style={styles.slideContainer}
        >
          {STEPS.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} active={i === currentStep} />
          ))}
        </ScrollView>

        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentStep ? colors.brand : colors.divider,
                  width: i === currentStep ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          {currentStep > 0 && (
            <Pressable
              onPress={() => {
                const prev = currentStep - 1;
                setCurrentStep(prev);
                scrollRef.current?.scrollTo({ x: (W - 32) * prev + prev * 16, animated: true });
              }}
              style={[styles.backArrow, { borderColor: colors.glassBorder, backgroundColor: colors.glassBackground }]}
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </Pressable>
          )}
          <Button
            label={isLast ? "Get Started" : "Next"}
            variant="primary"
            onPress={handleNext}
            loading={loading}
            icon={!isLast ? <Feather name="arrow-right" size={16} color="#FFF" /> : undefined}
            iconPosition="right"
            style={{ flex: 1 }}
            size="lg"
          />
        </View>

        {/* Glass feature summary at last step */}
        {isLast && (
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={18}
                tint={colors.isDark ? "dark" : "light"}
                style={[styles.summary, { borderColor: colors.glassBorder, overflow: "hidden" }]}
              >
                <SummaryContent colors={colors} />
              </BlurView>
            ) : (
              <View
                style={[
                  styles.summary,
                  { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder },
                ]}
              >
                <SummaryContent colors={colors} />
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </LinearGradient>
  );
}

function SummaryContent({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.summaryInner}>
      <Feather name="check-circle" size={18} color={colors.success} />
      <Text style={[styles.summaryText, { color: colors.foreground }]}>
        Your workspace is ready. The pipeline will run in the background and notify you when leads are ready.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  skipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  content: { flex: 1, paddingHorizontal: 16 },
  slideContainer: { flexGrow: 0 },
  slides: { gap: 16, paddingRight: 16 },
  stepSlide: { gap: 0 },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepNumber: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  stepNumberText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stepTitle: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -0.6, marginBottom: 8 },
  stepSubtitle: { fontSize: 16, fontFamily: "Inter_500Medium", marginBottom: 14, lineHeight: 22 },
  stepDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 20 },
  featureChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  featureChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  cta: { flexDirection: "row", gap: 12, alignItems: "center" },
  backArrow: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: { borderRadius: 14, borderWidth: 1, marginTop: 16 },
  summaryInner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  summaryText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
});
