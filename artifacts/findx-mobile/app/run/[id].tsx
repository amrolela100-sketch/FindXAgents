import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getAgentRun, getRunLogs } from "@/lib/api";
import { RUN_STATUS_COLORS, RUN_STATUS_BG, STATUS_COLORS, STATUS_BG, STATUS_LABELS } from "@/lib/types";
import type { AgentLog, Lead } from "@/lib/types";

type FeatherName = ComponentProps<typeof Feather>["name"];
type Tab = "leads" | "logs";

function LogItem({ log }: { log: AgentLog }) {
  const colors = useColors();
  const levelColor = log.level === "error" ? "#DC2626" : log.level === "warn" ? "#B45309" : colors.subtle;
  const levelBg = log.level === "error" ? "#FEF2F2" : log.level === "warn" ? "#FFFBEB" : colors.secondary;
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={[styles.logItem, { borderBottomColor: colors.border }]}
      onPress={() => setExpanded(e => !e)}
    >
      <View style={styles.logHeader}>
        <View style={[styles.levelPill, { backgroundColor: levelBg }]}>
          <Text style={[styles.levelText, { color: levelColor, fontFamily: "Inter_600SemiBold" }]}>
            {log.level}
          </Text>
        </View>
        <Text style={[styles.logPhase, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {log.phase}
          {log.agent?.displayName ? ` · ${log.agent.displayName}` : ""}
        </Text>
        {log.duration !== null && log.duration !== undefined && (
          <Text style={[styles.logDuration, { color: colors.subtle, fontFamily: "Inter_400Regular" }]}>
            {log.duration}ms
          </Text>
        )}
      </View>
      <Text
        style={[styles.logMessage, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
        numberOfLines={expanded ? undefined : 2}
      >
        {log.message}
      </Text>
      {log.toolName && (
        <View style={[styles.toolTag, { backgroundColor: "#EFF6FF" }]}>
          <Feather name={"tool" satisfies FeatherName} size={10} color="#1D4ED8" />
          <Text style={[styles.toolText, { color: "#1D4ED8", fontFamily: "Inter_500Medium" }]}>
            {log.toolName}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function LeadItem({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[lead.status];
  const statusBg = STATUS_BG[lead.status];
  const score = lead.leadScore;
  const scoreColor = score === null ? colors.mutedForeground : score >= 80 ? "#047857" : score >= 50 ? "#B45309" : "#DC2626";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.leadCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderLeftColor: statusColor,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.leadRow}>
        <View style={styles.leadInfo}>
          <Text style={[styles.leadName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {lead.businessName}
          </Text>
          <Text style={[styles.leadLocation, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {lead.city}{lead.industry ? ` · ${lead.industry}` : ""}
          </Text>
        </View>
        <View style={styles.leadRight}>
          {score !== null && (
            <Text style={[styles.leadScore, { color: scoreColor, fontFamily: "PlayfairDisplay_700Bold" }]}>{score}</Text>
          )}
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
              {STATUS_LABELS[lead.status]}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  const { data: runData, isLoading: runLoading } = useQuery({
    queryKey: ["run", id],
    queryFn: () => getAgentRun(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const run = query.state.data?.run;
      return run?.status === "running" || run?.status === "queued" ? 5000 : false;
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["run-logs", id],
    queryFn: () => getRunLogs(id!),
    enabled: !!id && activeTab === "logs",
  });

  const run = runData?.run;
  const leads = run?.leads ?? [];
  const logs = logsData?.logs ?? [];
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  if (runLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.foreground} size="large" />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Feather name={"alert-circle" satisfies FeatherName} size={36} color={colors.subtle} />
        <Text style={[styles.notFound, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Run not found
        </Text>
      </View>
    );
  }

  const statusColor = RUN_STATUS_COLORS[run.status];
  const statusBg = RUN_STATUS_BG[run.status];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="run-back-btn">
          <Feather name={"arrow-left" satisfies FeatherName} size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.topBarTitle}>
          <Text style={[styles.runQuery, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]} numberOfLines={2}>
            {run.query}
          </Text>
          <View style={styles.topBarRow}>
            <View style={[styles.badge, { backgroundColor: statusBg }]}>
              <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
                {run.status}
              </Text>
            </View>
            <Text style={[styles.runDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {new Date(run.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>{run.leadsFound}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>discovered</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>{run.leadsAnalyzed}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>analyzed</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>{run.emailsDrafted}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>emailed</Text>
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable
          style={[styles.tabBtn, activeTab === "leads" && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("leads")}
        >
          <Text style={[styles.tabText, { color: activeTab === "leads" ? colors.foreground : colors.mutedForeground, fontFamily: activeTab === "leads" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
            Leads ({run.leadsFound})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === "logs" && { borderBottomColor: colors.foreground, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab("logs")}
        >
          <Text style={[styles.tabText, { color: activeTab === "logs" ? colors.foreground : colors.mutedForeground, fontFamily: activeTab === "logs" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
            Logs
          </Text>
        </Pressable>
      </View>

      {activeTab === "leads" && (
        <FlatList
          data={leads}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 24 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={leads.length > 0}
          renderItem={({ item }) => (
            <LeadItem
              lead={item}
              onPress={() => router.push({ pathname: "/lead/[id]", params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name={"users" satisfies FeatherName} size={36} color={colors.subtle} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                No leads in this run
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {run.status === "running" ? "Run is still in progress..." : "Run completed with no leads"}
              </Text>
            </View>
          }
        />
      )}

      {activeTab === "logs" && (
        logsLoading ? (
          <ActivityIndicator color={colors.foreground} style={styles.loader} />
        ) : (
          <FlatList
            data={logs}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
            scrollEnabled={logs.length > 0}
            renderItem={({ item }) => <LogItem log={item} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name={"file-text" satisfies FeatherName} size={36} color={colors.subtle} />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  No logs yet
                </Text>
              </View>
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 15 },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4, marginTop: 2 },
  topBarTitle: { flex: 1, gap: 6 },
  runQuery: { fontSize: 17, lineHeight: 24 },
  topBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  runDate: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, textTransform: "capitalize" },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 24 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, marginVertical: 4 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 13 },
  leadCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 8,
  },
  leadRow: { flexDirection: "row", alignItems: "center" },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 14, marginBottom: 3 },
  leadLocation: { fontSize: 12 },
  leadRight: { alignItems: "flex-end", gap: 4 },
  leadScore: { fontSize: 20 },
  logItem: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 6,
  },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: { fontSize: 10 },
  logPhase: { flex: 1, fontSize: 11 },
  logDuration: { fontSize: 10 },
  logMessage: { fontSize: 13, lineHeight: 19 },
  toolTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  toolText: { fontSize: 10 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16 },
  emptySubtitle: { fontSize: 13, textAlign: "center", paddingHorizontal: 30 },
  loader: { marginTop: 40 },
});
