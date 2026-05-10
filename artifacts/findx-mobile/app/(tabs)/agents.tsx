import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getAgents } from "@/lib/api";
import type { Agent } from "@/lib/types";

type FeatherName = ComponentProps<typeof Feather>["name"];

const ROLE_ICONS: Record<string, FeatherName> = {
  discovery: "search",
  analyzer: "bar-chart-2",
  outreach: "mail",
  coordinator: "git-merge",
};

const ROLE_COLORS: Record<string, string> = {
  discovery: "#1D4ED8",
  analyzer: "#7E22CE",
  outreach: "#047857",
  coordinator: "#B45309",
};

const ROLE_BG: Record<string, string> = {
  discovery: "#EFF6FF",
  analyzer: "#FAF5FF",
  outreach: "#ECFDF5",
  coordinator: "#FFFBEB",
};

function AgentCard({ agent, order }: { agent: Agent; order: number }) {
  const colors = useColors();
  const iconName: FeatherName = ROLE_ICONS[agent.role] ?? "cpu";
  const roleColor = ROLE_COLORS[agent.role] ?? colors.mutedForeground;
  const roleBg = ROLE_BG[agent.role] ?? colors.secondary;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      testID={`agent-card-${agent.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.orderBadgeWrap}>
          <Text style={[styles.orderNum, { color: colors.subtle, fontFamily: "PlayfairDisplay_700Bold" }]}>
            {order}
          </Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: roleBg }]}>
          <Feather name={iconName} size={20} color={roleColor} />
        </View>
        <View style={styles.agentInfo}>
          <Text style={[styles.displayName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {agent.displayName}
          </Text>
          <Text style={[styles.agentRole, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {agent.role}
          </Text>
        </View>
        <View style={[styles.activeBadge, { backgroundColor: agent.isActive ? "#ECFDF5" : colors.secondary }]}>
          <View style={[styles.activeDot, { backgroundColor: agent.isActive ? "#047857" : colors.subtle }]} />
          <Text style={[styles.activeText, { color: agent.isActive ? "#047857" : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {agent.isActive ? "Active" : "Off"}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {agent.description}
      </Text>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Feather name={"cpu" satisfies FeatherName} size={11} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {agent.model}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name={"repeat" satisfies FeatherName} size={11} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {agent.maxIterations} iterations
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AgentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["agents"],
    queryFn: getAgents,
  });

  const agents = (data?.agents ?? []).slice().sort((a, b) => a.pipelineOrder - b.pipelineOrder);
  const topPadding = isWeb ? 67 : insets.top;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>Agents</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {agents.length} in pipeline
        </Text>
      </View>

      <FlatList
        data={agents}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 + 16,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={agents.length > 0}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.foreground} />
        }
        renderItem={({ item, index }) => <AgentCard agent={item} order={index + 1} />}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.foreground} style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name={"cpu" satisfies FeatherName} size={36} color={colors.subtle} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                No agents configured
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Seed agents from the web app to get started
              </Text>
            </View>
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 26, marginBottom: 2 },
  subtitle: { fontSize: 13 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  orderBadgeWrap: { width: 20, alignItems: "center" },
  orderNum: { fontSize: 16 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  agentInfo: { flex: 1 },
  displayName: { fontSize: 15, marginBottom: 1 },
  agentRole: { fontSize: 11, textTransform: "capitalize" },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { fontSize: 11 },
  description: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  loader: { marginTop: 40 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16 },
  emptySubtitle: { fontSize: 13, textAlign: "center", paddingHorizontal: 30 },
});
