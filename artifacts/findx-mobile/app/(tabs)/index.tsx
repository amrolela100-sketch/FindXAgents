import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge, RunStatusBadge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useColors } from "@/hooks/useColors";
import {
  getDashboardStatsM,
  getAgentRunsM,
  getLeadsM,
} from "@/lib/api-helpers";
import type { AgentPipelineRun, Lead } from "@/lib/types";

// ── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Feather>["name"];
  sub?: string;
  subColor?: string;
  delay?: number;
}

function StatCard({ label, value, icon, sub, subColor, delay = 0 }: StatCardProps) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={styles.statCardWrap}>
      <GlassCard style={styles.statCard} noPadding>
        <View style={styles.statCardInner}>
          <View style={[styles.statIconWrap, { backgroundColor: `${colors.brand}18` }]}>
            <Feather name={icon} size={16} color={colors.brand} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
          <Text style={[styles.statLabel, { color: colors.foregroundMuted }]}>{label}</Text>
          {sub && (
            <Text style={[styles.statSub, { color: subColor ?? colors.success }]}>{sub}</Text>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ── Lead Row ───────────────────────────────────────────────────────────────

function LeadRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const colors = useColors();
  return (
    <GlassCard
      style={[styles.leadCard, { borderLeftColor: getStatusBorderColor(lead.status, colors), borderLeftWidth: 3 }]}
      onPress={onPress}
      noPadding
    >
      <View style={styles.leadCardInner}>
        <View style={styles.leadInfo}>
          <Text style={[styles.leadName, { color: colors.foreground }]} numberOfLines={1}>
            {lead.businessName}
          </Text>
          <Text style={[styles.leadSub, { color: colors.foregroundMuted }]} numberOfLines={1}>
            {lead.city}{lead.industry ? ` · ${lead.industry}` : ""}
          </Text>
        </View>
        <View style={styles.leadRight}>
          {lead.leadScore !== null && <ScoreRing score={lead.leadScore} size={40} strokeWidth={3} />}
          <StatusBadge status={lead.status} />
        </View>
      </View>
    </GlassCard>
  );
}

function getStatusBorderColor(status: Lead["status"], colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "won": return colors.statusWonText;
    case "qualified": return colors.statusQualifiedText;
    case "contacting": return colors.statusContactingText;
    case "responded": return colors.statusRespondedText;
    case "analyzed": return colors.statusAnalyzedText;
    case "analyzing": return colors.statusAnalyzingText;
    case "lost": return colors.statusLostText;
    default: return colors.divider;
  }
}

// ── Run Row ────────────────────────────────────────────────────────────────

function RunRow({ run, onPress }: { run: AgentPipelineRun; onPress: () => void }) {
  const colors = useColors();
  const ts = new Date(run.createdAt).toLocaleDateString();
  return (
    <GlassCard style={styles.runCard} onPress={onPress} noPadding>
      <View style={styles.runCardInner}>
        <View style={styles.runInfo}>
          <Text style={[styles.runQuery, { color: colors.foreground }]} numberOfLines={1}>
            {run.query}
          </Text>
          <Text style={[styles.runDate, { color: colors.foregroundMuted }]}>{ts}</Text>
        </View>
        <View style={styles.runRight}>
          <RunStatusBadge status={run.status} />
          <View style={styles.runStats}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Feather name="users" size={10} color={colors.foregroundSubtle} />
              <Text style={[styles.runStat, { color: colors.foregroundSubtle }]}>{run.leadsFound}</Text>
            </View>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: colors.brand }]}>See all</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Dashboard Screen ───────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: getDashboardStatsM,
    staleTime: 60_000,
  });

  const {
    data: runsData,
    isLoading: runsLoading,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ["runs", { page: 1, pageSize: 3 }],
    queryFn: () => getAgentRunsM({ page: 1, pageSize: 3 }),
    staleTime: 30_000,
  });

  const {
    data: leadsData,
    isLoading: leadsLoading,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["leads", { page: 1, pageSize: 4 }],
    queryFn: () => getLeadsM({ page: 1, pageSize: 4 }),
    staleTime: 30_000,
  });

  const refreshing = statsLoading || runsLoading || leadsLoading;

  const onRefresh = () => {
    refetchStats();
    refetchRuns();
    refetchLeads();
  };

  const bgColors = colors.isDark
    ? (["#080810", "#0D0C1E"] as const)
    : (["#E8E6F4", "#F0EFF8"] as const);

  return (
    <LinearGradient colors={bgColors} style={styles.root}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={30}
            tint={colors.isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.glassBackground, borderBottomColor: colors.divider, borderBottomWidth: 1 },
            ]}
          />
        )}
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: colors.foregroundMuted }]}>Good morning 👋</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dashboard</Text>
          </View>
          <View style={styles.logoRow}>
            <LinearGradient
              colors={[colors.brandGradientStart, colors.brandGradientEnd]}
              style={styles.logoMark}
            >
              <Feather name="search" size={16} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.logoText, { color: colors.foreground }]}>FindX</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Leads" value={stats?.totalLeads ?? "—"} icon="users" delay={100} />
          <StatCard label="Analyzed" value={stats?.leadsAnalyzed ?? "—"} icon="bar-chart-2" delay={150} />
          <StatCard label="Contacted" value={stats?.leadsContacted ?? "—"} icon="mail" delay={200} />
          <StatCard
            label="Conversion"
            value={stats?.conversionRate ? `${stats.conversionRate}%` : "—"}
            icon="trending-up"
            sub={stats?.leadsWon ? `${stats.leadsWon} won` : undefined}
            subColor={colors.success}
            delay={250}
          />
        </View>

        {/* Recent Leads */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <SectionHeader title="Recent Leads" onSeeAll={() => router.push("/(tabs)/leads")} />
          <View style={styles.list}>
            {leadsLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: 20 }} />
            ) : (leadsData?.leads ?? []).slice(0, 4).map((lead) => (
              <LeadRow key={lead.id} lead={lead} onPress={() => router.push(`/lead/${lead.id}`)} />
            ))}
          </View>
        </Animated.View>

        {/* Recent Runs */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <SectionHeader title="Recent Runs" onSeeAll={() => router.push("/(tabs)/runs")} />
          <View style={styles.list}>
            {runsLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: 20 }} />
            ) : (runsData?.runs ?? []).slice(0, 3).map((run) => (
              <RunRow key={run.id} run={run} onPress={() => router.push(`/run/${run.id}`)} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 12, paddingHorizontal: 20, zIndex: 10 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  statCardWrap: { width: "46%", flex: 1, minWidth: 140 },
  statCard: { flex: 1 },
  statCardInner: { padding: 16, alignItems: "flex-start", gap: 6 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statSub: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { gap: 10, marginBottom: 28 },
  leadCard: { borderRadius: 14, overflow: "hidden" },
  leadCardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  leadSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  leadRight: { alignItems: "flex-end", gap: 6 },
  runCard: { borderRadius: 14, overflow: "hidden" },
  runCardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  runInfo: { flex: 1 },
  runQuery: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 3 },
  runDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  runRight: { alignItems: "flex-end", gap: 6 },
  runStats: { flexDirection: "row", gap: 8 },
  runStat: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
