import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { RunStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { getAgentRunsM, startAgentRun, cancelRunM } from "@/lib/api-helpers";
import type { AgentPipelineRun } from "@/lib/types";

const QUICK_QUERIES = [
  "Restaurants in Amsterdam that need a website",
  "Hair salons in Rotterdam without social media",
  "Plumbers in Utrecht without online reviews",
  "Bakeries in The Hague with poor SEO",
  "Gyms in Eindhoven without a booking system",
];

// ── Run Card ───────────────────────────────────────────────────────────────

function RunCard({
  run,
  onPress,
  onCancel,
}: {
  run: AgentPipelineRun;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const colors = useColors();
  const ts = new Date(run.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const isRunning = run.status === "running" || run.status === "queued";

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <GlassCard
        style={styles.runCard}
        onPress={onPress}
        glow={isRunning}
        noPadding
      >
        <View style={styles.runCardInner}>
          <View
            style={[
              styles.runIcon,
              {
                backgroundColor: isRunning
                  ? colors.runRunningBg
                  : run.status === "completed"
                  ? colors.runCompletedBg
                  : run.status === "failed"
                  ? colors.runFailedBg
                  : colors.statusDiscoveredBg,
              },
            ]}
          >
            <Feather
              name={
                isRunning
                  ? "loader"
                  : run.status === "completed"
                  ? "check-circle"
                  : run.status === "failed"
                  ? "alert-circle"
                  : "clock"
              }
              size={18}
              color={
                isRunning
                  ? colors.runRunningText
                  : run.status === "completed"
                  ? colors.runCompletedText
                  : run.status === "failed"
                  ? colors.runFailedText
                  : colors.foregroundMuted
              }
            />
          </View>
          <View style={styles.runInfo}>
            <Text style={[styles.runQuery, { color: colors.foreground }]} numberOfLines={2}>
              {run.query}
            </Text>
            <Text style={[styles.runDate, { color: colors.foregroundMuted }]}>{ts}</Text>
            <View style={styles.runStats}>
              <RunStatChip icon="users" value={run.leadsFound} label="found" colors={colors} />
              <RunStatChip icon="bar-chart-2" value={run.leadsAnalyzed} label="analyzed" colors={colors} />
              <RunStatChip icon="mail" value={run.emailsDrafted} label="drafted" colors={colors} />
            </View>
          </View>
          <View style={styles.runActions}>
            <RunStatusBadge status={run.status} />
            {isRunning && onCancel && (
              <Pressable
                onPress={() => {
                  Alert.alert("Cancel Run", "Stop this run?", [
                    { text: "Keep Running", style: "cancel" },
                    { text: "Cancel Run", style: "destructive", onPress: onCancel },
                  ]);
                }}
                style={[styles.cancelBtn, { backgroundColor: colors.runFailedBg }]}
              >
                <Feather name="x" size={13} color={colors.runFailedText} />
              </Pressable>
            )}
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function RunStatChip({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  value: number;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.runStatItem}>
      <Feather name={icon} size={11} color={colors.foregroundSubtle} />
      <Text style={[styles.runStatValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.runStatLabel, { color: colors.foregroundMuted }]}>{label}</Text>
    </View>
  );
}

// ── Start Run Modal ────────────────────────────────────────────────────────

function StartRunModal({
  visible,
  onClose,
  onStart,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onStart: (query: string) => void;
  loading: boolean;
}) {
  const colors = useColors();
  const [query, setQuery] = useState("");

  const bgColors = colors.isDark
    ? (["#0D0C1E", "#12102A"] as const)
    : (["#F0EFF8", "#E8E6F4"] as const);

  return (
    <Modal visible={visible} animationType="none" transparent presentationStyle="overFullScreen">
      <Pressable style={styles.modalScrim} onPress={onClose}>
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          exiting={SlideOutDown.duration(250)}
          style={styles.modalSheet}
        >
          <Pressable>
            <LinearGradient colors={bgColors} style={styles.modalContent}>
              <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Run</Text>
              <Text style={[styles.modalSub, { color: colors.foregroundMuted }]}>
                Describe the businesses you want to find
              </Text>
              <View
                style={[
                  styles.queryInput,
                  { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
                ]}
              >
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="e.g. Restaurants in Amsterdam without a website"
                  placeholderTextColor={colors.foregroundSubtle}
                  style={[styles.queryText, { color: colors.foreground }]}
                  multiline
                  autoFocus
                />
              </View>
              <Text style={[styles.quickTitle, { color: colors.foregroundMuted }]}>
                Quick suggestions
              </Text>
              <View style={styles.quickList}>
                {QUICK_QUERIES.map((q) => (
                  <Pressable key={q} onPress={() => setQuery(q)}>
                    <View
                      style={[
                        styles.quickChip,
                        {
                          backgroundColor: query === q ? `${colors.brand}18` : colors.glassBackground,
                          borderColor: query === q ? colors.brand : colors.glassBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          { color: query === q ? colors.brand : colors.foregroundMuted },
                        ]}
                        numberOfLines={2}
                      >
                        {q}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
                <Button
                  label={loading ? "Starting..." : "Start Run"}
                  variant="primary"
                  onPress={() => { if (query.trim()) onStart(query.trim()); }}
                  loading={loading}
                  disabled={!query.trim()}
                  style={{ flex: 2 }}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ── Runs Screen ────────────────────────────────────────────────────────────

export default function RunsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["runs-infinite"],
    queryFn: ({ pageParam = 1 }) =>
      getAgentRunsM({ page: pageParam as number, pageSize: 15 }),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 15_000,
    refetchInterval: 10_000,
  });

  const startMutation = useMutation({
    mutationFn: startAgentRun,
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: ["runs-infinite"] });
      setShowModal(false);
      if (newRun && "id" in newRun) {
        router.push(`/run/${(newRun as AgentPipelineRun).id}`);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelRunM,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs-infinite"] });
    },
  });

  const allRuns = data?.pages.flatMap((p) => p.runs) ?? [];
  const bgColors = colors.isDark
    ? (["#080810", "#0D0C1E"] as const)
    : (["#E8E6F4", "#F0EFF8"] as const);

  return (
    <LinearGradient colors={bgColors} style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Runs</Text>
            <Text style={[styles.headerSub, { color: colors.foregroundMuted }]}>
              {data?.pages[0]?.total ?? 0} runs total
            </Text>
          </View>
          <Pressable onPress={() => setShowModal(true)}>
            <LinearGradient
              colors={[colors.brandGradientStart, colors.brandGradientEnd]}
              style={styles.startBtn}
            >
              <Feather name="play" size={16} color="#FFF" />
              <Text style={styles.startBtnText}>New Run</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={allRuns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RunCard
            run={item}
            onPress={() => router.push(`/run/${item.id}`)}
            onCancel={
              item.status === "running" || item.status === "queued"
                ? () => cancelMutation.mutate(item.id)
                : undefined
            }
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.brand} style={styles.centerLoader} />
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[colors.brandGradientStart, colors.brandGradientEnd]}
                style={styles.emptyIcon}
              >
                <Feather name="play" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No runs yet</Text>
              <Text style={[styles.emptySub, { color: colors.foregroundMuted }]}>
                Start a run to discover and qualify leads
              </Text>
              <Button label="Start your first run" variant="primary" onPress={() => setShowModal(true)} style={{ marginTop: 8 }} />
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand} style={styles.footerLoader} />
          ) : null
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
      />

      <StartRunModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onStart={(q) => startMutation.mutate(q)}
        loading={startMutation.isPending}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, zIndex: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 2 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  runCard: { borderRadius: 14, overflow: "hidden" },
  runCardInner: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  runIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },
  runInfo: { flex: 1 },
  runQuery: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20, marginBottom: 4 },
  runDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  runStats: { flexDirection: "row", gap: 12 },
  runStatItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  runStatValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  runStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  runActions: { alignItems: "flex-end", gap: 8, paddingTop: 2 },
  cancelBtn: { padding: 6, borderRadius: 8 },
  centerLoader: { marginTop: 60 },
  footerLoader: { marginVertical: 20 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "90%" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  modalSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 16 },
  queryInput: { borderRadius: 14, borderWidth: 1, padding: 14, minHeight: 80, marginBottom: 16 },
  queryText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  quickTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  quickList: { gap: 8, marginBottom: 24 },
  quickChip: { borderRadius: 12, borderWidth: 1, padding: 10 },
  quickChipText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 12 },
});
