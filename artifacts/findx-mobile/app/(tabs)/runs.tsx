import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { cancelAgentRun, getAgentRuns, triggerAgentRun } from "@/lib/api";
import { RUN_STATUS_BG, RUN_STATUS_COLORS } from "@/lib/types";
import type { AgentPipelineRun, AgentRunStatus } from "@/lib/types";

type FeatherName = ComponentProps<typeof Feather>["name"];

const STATUS_ICONS: Record<AgentRunStatus, FeatherName> = {
  running: "loader",
  completed: "check-circle",
  partial: "alert-circle",
  failed: "x-circle",
  queued: "clock",
  cancelled: "slash",
};

const QUICK_QUERIES = [
  "Restaurants in Amsterdam",
  "Marketing agencies in Rotterdam",
  "IT companies in The Hague",
  "Retail shops in Utrecht",
  "Construction companies in Eindhoven",
];

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
  const statusColor = RUN_STATUS_COLORS[run.status];
  const statusBg = RUN_STATUS_BG[run.status];
  const icon = STATUS_ICONS[run.status];
  const date = new Date(run.createdAt);
  const duration =
    run.completedAt
      ? (() => {
          const ms = new Date(run.completedAt).getTime() - date.getTime();
          const mins = Math.floor(ms / 60000);
          const secs = Math.floor((ms % 60000) / 1000);
          return mins < 1 ? `${secs}s` : `${mins}m`;
        })()
      : null;
  const isActive = run.status === "running" || run.status === "queued";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
      testID={`run-card-${run.id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text
            style={[styles.query, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={2}
          >
            {run.query}
          </Text>
          <Text
            style={[styles.dateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            {date.toLocaleDateString()} ·{" "}
            {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {duration ? ` · ${duration}` : ""}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Feather name={icon} size={12} color={statusColor} />
            <Text
              style={[styles.statusText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}
            >
              {run.status}
            </Text>
          </View>
          {isActive && onCancel && (
            <Pressable
              onPress={onCancel}
              style={[styles.cancelBtn, { borderColor: "#FCA5A5" }]}
              hitSlop={8}
            >
              <Feather name="x" size={11} color="#DC2626" />
              <Text style={[styles.cancelBtnText, { color: "#DC2626", fontFamily: "Inter_500Medium" }]}>
                Cancel
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statNum, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}
          >
            {run.leadsFound}
          </Text>
          <Text
            style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            discovered
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text
            style={[styles.statNum, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}
          >
            {run.leadsAnalyzed}
          </Text>
          <Text
            style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            analyzed
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text
            style={[styles.statNum, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}
          >
            {run.emailsDrafted}
          </Text>
          <Text
            style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            emailed
          </Text>
        </View>
      </View>

      {run.error && (
        <View
          style={[styles.errorRow, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
        >
          <Feather name={"alert-triangle" satisfies FeatherName} size={12} color="#DC2626" />
          <Text
            style={[styles.errorText, { color: "#DC2626", fontFamily: "Inter_400Regular" }]}
            numberOfLines={2}
          >
            {run.error}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function NewRunModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: (runId: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState("20");
  const [language, setLanguage] = useState<"en" | "nl" | "ar">("en");

  const mutation = useMutation({
    mutationFn: () =>
      triggerAgentRun(query.trim(), {
        maxResults: parseInt(maxResults, 10) || 20,
        language,
      }),
    onSuccess: (data) => {
      const runId = "runId" in data ? data.runId : data.id;
      setQuery("");
      onClose();
      onSuccess(runId);
    },
    onError: (err) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to start run");
    },
  });

  const canSubmit = query.trim().length >= 3 && !mutation.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.modalHeader,
            { borderBottomColor: colors.border, paddingTop: Platform.OS === "ios" ? 20 : insets.top + 8 },
          ]}
        >
          <View>
            <Text
              style={[styles.modalTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}
            >
              New Pipeline Run
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            >
              Search and discover new leads
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search Query */}
          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Search Query *
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="e.g. Marketing agencies in Amsterdam"
              placeholderTextColor={colors.subtle}
              value={query}
              onChangeText={setQuery}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
              testID="new-run-query"
            />
          </View>

          {/* Quick suggestions */}
          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Quick suggestions
            </Text>
            <View style={styles.chips}>
              {QUICK_QUERIES.map((q) => (
                <Pressable
                  key={q}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: query === q ? colors.foreground : colors.card,
                      borderColor: query === q ? colors.foreground : colors.border,
                    },
                  ]}
                  onPress={() => setQuery(q)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: query === q ? colors.card : colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                  >
                    {q}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Max results */}
          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Max Results
            </Text>
            <View style={styles.row}>
              {["10", "20", "50"].map((v) => (
                <Pressable
                  key={v}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: maxResults === v ? colors.foreground : colors.card,
                      borderColor: maxResults === v ? colors.foreground : colors.border,
                      flex: 1,
                    },
                  ]}
                  onPress={() => setMaxResults(v)}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      {
                        color: maxResults === v ? colors.card : colors.mutedForeground,
                        fontFamily: maxResults === v ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Language */}
          <View style={styles.inputGroup}>
            <Text
              style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
            >
              Language
            </Text>
            <View style={styles.row}>
              {([["en", "English"], ["nl", "Dutch"], ["ar", "Arabic"]] as const).map(([val, label]) => (
                <Pressable
                  key={val}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: language === val ? colors.foreground : colors.card,
                      borderColor: language === val ? colors.foreground : colors.border,
                      flex: 1,
                    },
                  ]}
                  onPress={() => setLanguage(val)}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      {
                        color: language === val ? colors.card : colors.mutedForeground,
                        fontFamily: language === val ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, { opacity: canSubmit ? 1 : 0.45 }]}
            onPress={() => mutation.mutate()}
            disabled={!canSubmit}
            testID="start-run-btn"
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={16} color="#fff" />
                <Text style={[styles.submitBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Start Pipeline Run
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function RunsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";
  const [showNewRun, setShowNewRun] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["agent-runs"],
    queryFn: getAgentRuns,
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAgentRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs"] });
    },
    onError: (err) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to cancel run");
    },
  });

  const runs = data?.runs ?? [];
  const topPadding = isWeb ? 67 : insets.top;

  const handleCancel = (runId: string) => {
    Alert.alert("Cancel Run", "Are you sure you want to cancel this run?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => cancelMutation.mutate(runId),
      },
    ]);
  };

  const handleRunSuccess = (runId: string) => {
    queryClient.invalidateQueries({ queryKey: ["agent-runs"] });
    router.push({ pathname: "/run/[id]", params: { id: runId } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 16, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text
            style={[styles.title, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}
          >
            Pipeline Runs
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            {runs.length} run{runs.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable
          style={[styles.newRunBtn, { backgroundColor: colors.foreground }]}
          onPress={() => setShowNewRun(true)}
          testID="new-run-fab"
        >
          <Feather name="plus" size={16} color={colors.card} />
          <Text
            style={[styles.newRunBtnText, { color: colors.card, fontFamily: "Inter_600SemiBold" }]}
          >
            New Run
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 + 16,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={runs.length > 0}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.foreground} />
        }
        renderItem={({ item }) => (
          <RunCard
            run={item}
            onPress={() => router.push({ pathname: "/run/[id]", params: { id: item.id } })}
            onCancel={
              item.status === "running" || item.status === "queued"
                ? () => handleCancel(item.id)
                : undefined
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.foreground} style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name={"activity" satisfies FeatherName} size={48} color={colors.subtle} />
              <Text
                style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
              >
                No pipeline runs yet
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              >
                Tap "New Run" to start discovering leads
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.foreground }]}
                onPress={() => setShowNewRun(true)}
              >
                <Feather name="zap" size={14} color={colors.card} />
                <Text
                  style={[styles.emptyBtnText, { color: colors.card, fontFamily: "Inter_600SemiBold" }]}
                >
                  Start First Run
                </Text>
              </Pressable>
            </View>
          )
        }
      />

      <NewRunModal
        visible={showNewRun}
        onClose={() => setShowNewRun(false)}
        onSuccess={handleRunSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerLeft: { gap: 2 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 13 },
  newRunBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    marginBottom: 2,
  },
  newRunBtnText: { fontSize: 14 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 16, paddingBottom: 14 },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: "flex-end", gap: 8 },
  query: { fontSize: 15, marginBottom: 4 },
  dateText: { fontSize: 12 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, textTransform: "capitalize" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FEF2F2",
  },
  cancelBtnText: { fontSize: 11 },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: { flex: 1, alignItems: "center", gap: 1 },
  statNum: { fontSize: 20 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, marginVertical: 2 },
  errorRow: {
    flexDirection: "row",
    gap: 8,
    margin: 12,
    marginTop: 0,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  errorText: { flex: 1, fontSize: 12 },
  loader: { marginTop: 40 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 16 },
  emptySubtitle: { fontSize: 13, textAlign: "center", paddingHorizontal: 30 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 14 },
  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 22, marginBottom: 2 },
  modalSubtitle: { fontSize: 13 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12 },
  row: { flexDirection: "row", gap: 8 },
  optionBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  optionBtnText: { fontSize: 13 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111",
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnText: { fontSize: 15, color: "#fff" },
});
