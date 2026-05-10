import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import type { ComponentProps } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getDashboardStats, getAgentRuns, getLeads } from "@/lib/api";
import { STATUS_COLORS, STATUS_BG, STATUS_LABELS, RUN_STATUS_COLORS, RUN_STATUS_BG } from "@/lib/types";
import type { AgentPipelineRun, Lead } from "@/lib/types";

type FeatherName = ComponentProps<typeof Feather>["name"];

interface StatCardProps {
  label: string;
  value: string | number;
  icon: FeatherName;
  sub?: string;
  subColor?: string;
}

function StatCard({ label, value, icon, sub, subColor }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
      {sub ? (
        <Text style={[styles.statSub, { color: subColor ?? colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function RunItem({ run, onPress }: { run: AgentPipelineRun; onPress: () => void }) {
  const colors = useColors();
  const statusColor = RUN_STATUS_COLORS[run.status];
  const statusBg = RUN_STATUS_BG[run.status];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
      testID={`run-item-${run.id}`}
    >
      <View style={styles.listItemLeft}>
        <Text style={[styles.listItemTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
          {run.query}
        </Text>
        <Text style={[styles.listItemMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {run.leadsFound} leads · {run.leadsAnalyzed} analyzed · {new Date(run.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: statusBg }]}>
        <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
          {run.status}
        </Text>
      </View>
    </Pressable>
  );
}

function LeadItem({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[lead.status];
  const statusBg = STATUS_BG[lead.status];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.listItem,
        { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: statusColor, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
      testID={`lead-item-${lead.id}`}
    >
      <View style={styles.listItemLeft}>
        <Text style={[styles.listItemTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {lead.businessName}
        </Text>
        <Text style={[styles.listItemMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {lead.city}{lead.industry ? ` · ${lead.industry}` : ""}
        </Text>
      </View>
      <View style={styles.listItemRight}>
        {lead.leadScore !== null && (
          <Text style={[styles.scoreText, { color: lead.leadScore >= 80 ? "#047857" : lead.leadScore >= 50 ? "#B45309" : "#DC2626", fontFamily: "PlayfairDisplay_700Bold" }]}>
            {lead.leadScore}
          </Text>
        )}
        <View style={[styles.badge, { backgroundColor: statusBg }]}>
          <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
            {STATUS_LABELS[lead.status]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const {
    data: statsData,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const {
    data: runsData,
    isLoading: runsLoading,
    isFetching: runsFetching,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ["agent-runs"],
    queryFn: getAgentRuns,
  });

  const {
    data: leadsData,
    isLoading: leadsLoading,
    isFetching: leadsFetching,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["leads", { pageSize: 5 }],
    queryFn: () => getLeads({ pageSize: 5 }),
  });

  const isRefreshing = statsFetching || runsFetching || leadsFetching;
  const onRefresh = () => { refetchStats(); refetchRuns(); refetchLeads(); };

  const stats = statsData?.stats;
  const recentRuns = runsData?.runs?.slice(0, 3) ?? [];
  const recentLeads = leadsData?.leads?.slice(0, 5) ?? [];
  const topPad = isWeb ? 67 : insets.top;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 + 16 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.foreground} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
            {greeting}
          </Text>
          <Text style={[styles.dateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {dateStr} · Pipeline overview
          </Text>
        </View>
        <View style={[styles.logo, { backgroundColor: colors.foreground }]}>
          <Feather name={"zap" satisfies FeatherName} size={18} color={colors.card} />
        </View>
      </View>

      {statsLoading ? (
        <ActivityIndicator color={colors.foreground} style={styles.loader} />
      ) : stats ? (
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Leads"
            value={stats.totalLeads}
            icon={"database" satisfies FeatherName}
            sub={stats.leadsThisWeek > 0 ? `+${stats.leadsThisWeek} this week` : "No new leads this week"}
            subColor={stats.leadsThisWeek > 0 ? "#047857" : "#DC2626"}
          />
          <StatCard
            label="Analyzed"
            value={stats.leadsAnalyzed}
            icon={"bar-chart-2" satisfies FeatherName}
            sub={stats.totalLeads > 0 ? `${Math.round((stats.leadsAnalyzed / stats.totalLeads) * 100)}% of total` : "0% of total"}
            subColor={stats.leadsAnalyzed > 0 ? "#DC2626" : "#DC2626"}
          />
          <StatCard
            label="Contacted"
            value={stats.leadsContacted}
            icon={"mail" satisfies FeatherName}
            sub={stats.leadsResponded > 0 ? `${stats.leadsResponded} responded` : "0 responded"}
            subColor={stats.leadsResponded > 0 ? "#047857" : "#047857"}
          />
          <StatCard
            label="Conversion Rate"
            value={`${stats.conversionRate}%`}
            icon={"trending-up" satisfies FeatherName}
            sub={stats.leadsWon > 0 ? `${stats.leadsWon} won deals` : "0 won deals"}
            subColor="#047857"
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Recent Leads
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/leads")} testID="view-all-leads">
            <Text style={[styles.viewAll, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>View all →</Text>
          </Pressable>
        </View>
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {leadsLoading ? (
            <ActivityIndicator color={colors.foreground} style={styles.loader} />
          ) : recentLeads.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No leads yet
              </Text>
            </View>
          ) : (
            recentLeads.map((lead, i) => (
              <React.Fragment key={lead.id}>
                <LeadItem
                  lead={lead}
                  onPress={() => router.push({ pathname: "/lead/[id]", params: { id: lead.id } })}
                />
                {i < recentLeads.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Recent Pipeline Runs
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/runs")} testID="view-all-runs">
            <Text style={[styles.viewAll, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>View all →</Text>
          </Pressable>
        </View>
        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {runsLoading ? (
            <ActivityIndicator color={colors.foreground} style={styles.loader} />
          ) : recentRuns.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No runs yet
              </Text>
            </View>
          ) : (
            recentRuns.map((run, i) => (
              <React.Fragment key={run.id}>
                <RunItem
                  run={run}
                  onPress={() => router.push({ pathname: "/run/[id]", params: { id: run.id } })}
                />
                {i < recentRuns.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 26, marginBottom: 2 },
  dateText: { fontSize: 13 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: "46%",
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: { fontSize: 28 },
  statLabel: { fontSize: 12 },
  statSub: { fontSize: 11 },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15 },
  viewAll: { fontSize: 13 },
  listCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    gap: 10,
  },
  listItemLeft: { flex: 1 },
  listItemTitle: { fontSize: 14, marginBottom: 3 },
  listItemMeta: { fontSize: 12 },
  listItemRight: { alignItems: "flex-end", gap: 4 },
  scoreText: { fontSize: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10 },
  divider: { height: 1, marginHorizontal: 14 },
  loader: { marginVertical: 20 },
  emptyRow: { padding: 20, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
