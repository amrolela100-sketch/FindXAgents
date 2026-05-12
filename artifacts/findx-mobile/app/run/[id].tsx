import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { RunStatusBadge, StatusBadge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { getAgentRunM, cancelRunM, getAgentLogsM } from "@/lib/api-helpers";
import type { AgentPipelineRun, AgentLog, Lead } from "@/lib/types";

function StatTile({
  icon, value, label, color, bg,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  const colors = useColors();
  return (
    <GlassCard noPadding style={styles.statTile}>
      <View style={styles.statTileInner}>
        <View style={[styles.statTileIcon, { backgroundColor: bg }]}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.statTileValue, { color: colors.foreground }]}>{value}</Text>
        <Text style={[styles.statTileLabel, { color: colors.foregroundMuted }]}>{label}</Text>
      </View>
    </GlassCard>
  );
}

function LogItem({ log }: { log: AgentLog }) {
  const colors = useColors();
  const levelColor: Record<string, string> = {
    info: colors.info,
    warn: colors.warning,
    error: colors.danger,
    debug: colors.foregroundSubtle,
    success: colors.success,
  };
  const color = levelColor[log.level.toLowerCase()] ?? colors.foregroundMuted;
  const ts = new Date(log.createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <View style={[styles.logItem, { borderLeftColor: color }]}>
      <Text style={[styles.logTs, { color: colors.foregroundSubtle }]}>{ts}</Text>
      {log.toolName && (
        <View style={[styles.logTool, { backgroundColor: `${colors.brand}18` }]}>
          <Text style={[styles.logToolText, { color: colors.brand }]}>{log.toolName}</Text>
        </View>
      )}
      <Text style={[styles.logMsg, { color: colors.foreground }]}>{log.message}</Text>
    </View>
  );
}

function RunLeadRow({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const colors = useColors();
  return (
    <GlassCard onPress={onPress} noPadding style={styles.runLeadCard}>
      <View style={styles.runLeadInner}>
        <ScoreRing score={lead.leadScore} size={42} strokeWidth={3} />
        <View style={styles.runLeadInfo}>
          <Text style={[styles.runLeadName, { color: colors.foreground }]} numberOfLines={1}>{lead.businessName}</Text>
          <Text style={[styles.runLeadCity, { color: colors.foregroundMuted }]} numberOfLines={1}>
            {lead.city}{lead.industry ? ` · ${lead.industry}` : ""}
          </Text>
        </View>
        <StatusBadge status={lead.status} />
      </View>
    </GlassCard>
  );
}

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showLogs, setShowLogs] = useState(false);
  const logsScrollRef = useRef<ScrollView>(null);

  const { data: run, isLoading } = useQuery({
    queryKey: ["run", id],
    queryFn: () => getAgentRunM(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 3000 : false,
  });

  const { data: logs } = useQuery({
    queryKey: ["run-logs", id],
    queryFn: () => getAgentLogsM(id!),
    enabled: !!id && showLogs,
    refetchInterval: run?.status === "running" ? 3000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelRunM(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", id] });
      queryClient.invalidateQueries({ queryKey: ["runs-infinite"] });
    },
  });

  const isRunning = run?.status === "running" || run?.status === "queued";

  const bgColors = colors.isDark
    ? (["#080810", "#0D0C1E"] as const)
    : (["#E8E6F4", "#F0EFF8"] as const);

  return (
    <LinearGradient colors={bgColors} style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={30}
            tint={colors.isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, { borderBottomColor: colors.divider, borderBottomWidth: 1 }]}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBackground, borderBottomColor: colors.divider, borderBottomWidth: 1 }]}
          />
        )}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        {run && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={[styles.runQuery, { color: colors.foreground }]} numberOfLines={2}>{run.query}</Text>
              <RunStatusBadge status={run.status} />
            </View>
            <Text style={[styles.runDate, { color: colors.foregroundMuted }]}>
              {new Date(run.createdAt).toLocaleString()}
            </Text>
          </Animated.View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && run && (
          <>
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
              <StatTile icon="users" value={run.leadsFound} label="Discovered" color={colors.statusContactingText} bg={colors.statusContactingBg} />
              <StatTile icon="bar-chart-2" value={run.leadsAnalyzed} label="Analyzed" color={colors.statusAnalyzedText} bg={colors.statusAnalyzedBg} />
              <StatTile icon="mail" value={run.emailsDrafted} label="Emailed" color={colors.statusWonText} bg={colors.statusWonBg} />
            </Animated.View>

            {isRunning && (
              <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                <Button
                  label="Cancel Run"
                  variant="danger"
                  icon={<Feather name="x-circle" size={16} color="#FFF" />}
                  onPress={() => {
                    Alert.alert("Cancel Run", "Stop this run?", [
                      { text: "Keep Running", style: "cancel" },
                      { text: "Cancel", style: "destructive", onPress: () => cancelMutation.mutate() },
                    ]);
                  }}
                  loading={cancelMutation.isPending}
                  fullWidth
                  style={{ marginBottom: 16 }}
                />
              </Animated.View>
            )}

            {run.leads && run.leads.length > 0 && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Leads ({run.leads.length})
                </Text>
                <View style={styles.leadsList}>
                  {run.leads.map((lead) => (
                    <RunLeadRow key={lead.id} lead={lead} onPress={() => router.push(`/lead/${lead.id}`)} />
                  ))}
                </View>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <Pressable
                onPress={() => setShowLogs((s) => !s)}
                style={[styles.logsToggle, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
              >
                <Feather name="terminal" size={15} color={colors.foreground} />
                <Text style={[styles.logsToggleText, { color: colors.foreground }]}>
                  {showLogs ? "Hide" : "Show"} Logs
                </Text>
                <Feather name={showLogs ? "chevron-up" : "chevron-down"} size={15} color={colors.foregroundSubtle} />
              </Pressable>

              {showLogs && logs && logs.length > 0 && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <GlassCard noPadding style={styles.logsCard}>
                    <ScrollView
                      style={styles.logsScroll}
                      ref={logsScrollRef}
                      onContentSizeChange={() => logsScrollRef.current?.scrollToEnd({ animated: false })}
                    >
                      {logs.map((log) => <LogItem key={log.id} log={log} />)}
                    </ScrollView>
                  </GlassCard>
                </Animated.View>
              )}
            </Animated.View>

            {run.error && (
              <Animated.View entering={FadeInDown.delay(350).duration(400)}>
                <GlassCard noPadding style={[styles.errorCard, { borderColor: colors.danger }]}>
                  <View style={styles.errorInner}>
                    <Feather name="alert-circle" size={18} color={colors.danger} />
                    <Text style={[styles.errorText, { color: colors.danger }]}>{run.error}</Text>
                  </View>
                </GlassCard>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 0, zIndex: 10 },
  backBtn: { padding: 16, paddingBottom: 8 },
  headerContent: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  runQuery: { fontSize: 18, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 24 },
  runDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statTile: { flex: 1, borderRadius: 14, overflow: "hidden" },
  statTileInner: { padding: 14, alignItems: "flex-start", gap: 6 },
  statTileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statTileValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statTileLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  leadsList: { gap: 10, marginBottom: 20 },
  runLeadCard: { borderRadius: 12, overflow: "hidden" },
  runLeadInner: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  runLeadInfo: { flex: 1 },
  runLeadName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  runLeadCity: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logsToggle: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  logsToggleText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  logsCard: { borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  logsScroll: { maxHeight: 320, padding: 12 },
  logItem: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 6, paddingVertical: 6, paddingLeft: 10, borderLeftWidth: 2, marginBottom: 4 },
  logTs: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  logTool: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  logToolText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  logMsg: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
  errorCard: { borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  errorInner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
