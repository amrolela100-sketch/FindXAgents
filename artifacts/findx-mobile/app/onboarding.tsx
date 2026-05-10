import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { completeOnboarding } from "@/lib/api";

const { width: SW } = Dimensions.get("window");

const INDUSTRIES = ["SaaS", "Fintech", "E-commerce", "Logistics", "Marketing", "Healthcare", "Manufacturing", "Other"];
const CITIES = ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "All of Netherlands"];

interface OnboardingData {
  [key: string]: unknown;
  companyName: string;
  companyWebsite: string;
  industry: string;
  city: string;
  icp: string;
  targetIndustry: string;
  targetCity: string;
}

function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function PillButton({ label, active, onPress, dark }: { label: string; active: boolean; onPress: () => void; dark?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? (dark ? "#fff" : colors.foreground) : colors.card,
          borderColor: active ? (dark ? "#fff" : colors.foreground) : colors.border,
        },
      ]}
    >
      <Text style={[styles.pillText, {
        color: active ? (dark ? colors.foreground : colors.background) : colors.mutedForeground,
        fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
      }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [data, setData] = useState<OnboardingData>({
    companyName: "",
    companyWebsite: "",
    industry: "",
    city: "",
    icp: "",
    targetIndustry: "",
    targetCity: "",
  });

  const TOTAL = 4;

  const animateToStep = (next: number) => {
    const dir = next > step ? 1 : -1;
    slideAnim.setValue(dir * SW);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    setStep(next);
  };

  const handleNext = async () => {
    if (Platform.OS !== "web") await Haptics.selectionAsync();
    if (step < TOTAL - 1) { animateToStep(step + 1); return; }
    setSaving(true);
    try {
      await completeOnboarding(data);
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete?.();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 0) animateToStep(step - 1);
  };

  const steps = [
    {
      title: "Welcome to FindX!",
      subtitle: "Let's set up your account in 3 steps.",
      icon: "zap" as const,
      content: () => (
        <FadeIn delay={0}>
          <View style={styles.stepContent}>
            <View style={[styles.agentGrid]}>
              {[
                { icon: "search" as const, name: "Discovery Agent", desc: "Finds prospects" },
                { icon: "bar-chart-2" as const, name: "Analysis Agent", desc: "Scores leads" },
                { icon: "mail" as const, name: "Outreach Agent", desc: "Writes emails" },
              ].map((a) => (
                <View key={a.name} style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.miniIconBox, { backgroundColor: colors.secondary }]}>
                    <Feather name={a.icon} size={16} color={colors.foreground} />
                  </View>
                  <Text style={[styles.miniName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{a.name}</Text>
                  <Text style={[styles.miniDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{a.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>
      ),
    },
    {
      title: "Your company",
      subtitle: "Tell us about your organisation.",
      icon: "briefcase" as const,
      content: () => (
        <FadeIn delay={0}>
          <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Company name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="e.g. Acme B.V."
                placeholderTextColor={colors.mutedForeground}
                value={data.companyName}
                onChangeText={(v) => setData((d) => ({ ...d, companyName: v }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Website</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="e.g. acme.nl"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
                value={data.companyWebsite}
                onChangeText={(v) => setData((d) => ({ ...d, companyWebsite: v }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Industry</Text>
              <View style={styles.pillRow}>
                {INDUSTRIES.slice(0, 6).map((ind) => (
                  <PillButton key={ind} label={ind} active={data.industry === ind} onPress={() => setData((d) => ({ ...d, industry: ind }))} />
                ))}
              </View>
            </View>
          </View>
        </FadeIn>
      ),
    },
    {
      title: "Ideal customer",
      subtitle: "Describe who your agents should find.",
      icon: "target" as const,
      content: () => (
        <FadeIn delay={0}>
          <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>ICP description</Text>
              <TextInput
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="e.g. Dutch B2B SaaS companies with 10-200 employees that are growing..."
                placeholderTextColor={colors.mutedForeground}
                value={data.icp}
                onChangeText={(v) => setData((d) => ({ ...d, icp: v }))}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Target industry</Text>
              <View style={styles.pillRow}>
                {INDUSTRIES.slice(0, 6).map((ind) => (
                  <PillButton key={ind} label={ind} active={data.targetIndustry === ind} onPress={() => setData((d) => ({ ...d, targetIndustry: ind }))} />
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Target region</Text>
              <View style={styles.pillRow}>
                {CITIES.map((c) => (
                  <PillButton key={c} label={c} active={data.targetCity === c} onPress={() => setData((d) => ({ ...d, targetCity: c }))} />
                ))}
              </View>
            </View>
          </View>
        </FadeIn>
      ),
    },
    {
      title: "Ready to go!",
      subtitle: "Your profile is set. Start the agents.",
      icon: "check-circle" as const,
      content: () => (
        <FadeIn delay={0}>
          <View style={styles.stepContent}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Your settings</Text>
              {[
                { label: "Company", value: data.companyName || "—" },
                { label: "Industry", value: data.industry || "—" },
                { label: "Target market", value: data.targetIndustry || "—" },
                { label: "Region", value: data.targetCity || "—" },
              ].map(({ label, value }) => (
                <View key={label} style={[styles.summaryRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.summaryKey, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </FadeIn>
      ),
    },
  ];

  const current = steps[step];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressTrack}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: i <= step ? colors.foreground : colors.border,
                  flex: i === step ? 2 : 1,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.progressText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {step + 1} / {TOTAL}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: 24 }}>
        {/* Step header */}
        <FadeIn delay={0}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepIconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={current.icon} size={24} color={colors.foreground} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
              {current.title}
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {current.subtitle}
            </Text>
          </View>
        </FadeIn>

        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {current.content()}
        </Animated.View>
      </ScrollView>

      {/* Bottom navigation */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        {step > 0 && (
          <Pressable
            onPress={handleBack}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
        )}
        <Pressable
          onPress={handleNext}
          disabled={saving}
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: pressed ? "#2A2A2A" : colors.foreground, flex: step > 0 ? 1 : undefined, width: step === 0 ? "100%" : undefined, opacity: saving ? 0.7 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <>
              <Text style={[styles.nextBtnText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
                {step === TOTAL - 1 ? "Start FindX" : "Next"}
              </Text>
              <Feather name={step === TOTAL - 1 ? "zap" : "arrow-right"} size={16} color={colors.background} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressBar: { paddingHorizontal: 24, paddingBottom: 8 },
  progressTrack: { flexDirection: "row", gap: 4, marginBottom: 6 },
  progressSegment: { height: 3, borderRadius: 2 },
  progressText: { fontSize: 11 },

  stepHeader: { paddingTop: 24, paddingBottom: 24, gap: 12 },
  stepIconBox: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  stepSubtitle: { fontSize: 15, lineHeight: 22 },

  stepContent: { gap: 20 },
  agentGrid: { flexDirection: "row", gap: 8 },
  miniCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 6, alignItems: "center" },
  miniIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  miniName: { fontSize: 11, textAlign: "center" },
  miniDesc: { fontSize: 10, textAlign: "center", lineHeight: 14 },

  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textarea: { height: 100, textAlignVertical: "top" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 13 },

  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 0 },
  summaryLabel: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1 },
  summaryKey: { fontSize: 13 },
  summaryVal: { fontSize: 13 },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  backBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  nextBtn: { height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  nextBtnText: { fontSize: 15 },
});
