import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { useColors } from "@/hooks/useColors";
import { getAgentsM } from "@/lib/api-helpers";
import type { Agent } from "@/lib/types";

const ROLE_CONFIG: Record<
  string,
  { icon: React.ComponentProps<typeof Feather>["name"]; color: string; bg: string; label: string }
> = {
  discovery:    { icon: "search",      color: "#60A5FA", bg: "rgba(59,130,246,0.12)",  label: "Discovery" },
  analysis:     { icon: "bar-chart-2", color: "#C084FC", bg: "rgba(168,85,247,0.12)",  label: "Analysis" },
  outreach:     { icon: "mail",        color: "#34D399", bg: "rgba(16,185,129,0.12)",  label: "Outreach" },
  orchestrator: { icon: "cpu",         color: "#FBBF24", bg: "rgba(245,158,11,0.12)",  label: "Orchestrator" },
};

function getRoleConfig(role: string, colors: ReturnType<typeof useColors>) {
  const key = role.toLowerCase();
  return ROLE_CONFIG[key] ?? { icon: "zap" as const, color: colors.brand, bg: `${colors.brand}18`, label: role };
}

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const colors = useColors();
  const roleConf = getRoleConfig(agent.role, colors);

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(500)}>
      <GlassCard style={styles.agentCard} noPadding>
        <View style={styles.agentCardInner}>
          <View style={styles.agentTopRow}>
            <View style={[styles.agentIcon, { backgroundColor: roleConf.bg }]}>
              <Feather name={roleConf.icon} size={20} color={roleConf.color} />
            </View>
            <View style={[styles.pipelineBadge, { backgroundColor: colors.statusAnalyzingBg }]}>
              <Text style={[styles.pipelineText, { color: colors.brand }]}>#{agent.pipelineOrder}</Text>
            </View>
            <View
              style={[
                styles.activeBadge,
                { backgroundColor: agent.isActive ? colors.statusWonBg : colors.statusDiscoveredBg },
              ]}
            >
              <View
                style={[
                  styles.activeDot,
                  { backgroundColor: agent.isActive ? colors.statusWonText : colors.foregroundSubtle },
                ]}
              />
              <Text
                style={[
                  styles.activeText,
                  { color: agent.isActive ? colors.statusWonText : colors.foregroundSubtle },
                ]}
              >
                {agent.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          <View style={styles.agentNames}>
            <Text style={[styles.agentDisplayName, { color: colors.foreground }]}>{agent.displayName}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleConf.bg }]}>
              <Text style={[styles.roleText, { color: roleConf.color }]}>{roleConf.label}</Text>
            </View>
          </View>

          <Text style={[styles.agentDesc, { color: colors.foregroundMuted }]} numberOfLines={3}>
            {agent.description}
          </Text>

          <View style={[styles.agentFooter, { borderTopColor: colors.divider }]}>
            <View style={styles.agentMeta}>
              <Feather name="cpu" size={12} color={colors.foregroundSubtle} />
              <Text style={[styles.agentMetaText, { color: colors.foregroundSubtle }]}>{agent.model}</Text>
            </View>
            <View style={styles.agentMeta}>
              <Feather name="repeat" size={12} color={colors.foregroundSubtle} />
              <Text style={[styles.agentMetaText, { color: colors.foregroundSubtle }]}>
                {agent.maxIterations} iterations
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

function AgentSkeleton({ index }: { index: number }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <View
        style={[styles.skeletonCard, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
      >
        <View style={[styles.skeletonIcon, { backgroundColor: colors.divider }]} />
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, { backgroundColor: colors.divider, width: "60%" }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.divider, width: "40%", marginTop: 8 }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.divider, width: "80%", marginTop: 8 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function AgentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: getAgentsM,
    staleTime: 120_000,
  });

  const bgColors = colors.isDark
    ? (["#080810", "#0D0C1E"] as const)
    : (["#E8E6F4", "#F0EFF8"] as const);

  const activeCount = agents?.filter((a) => a.isActive).length ?? 0;

  return (
    <LinearGradient colors={bgColors} style={styles.root}>
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Agents</Text>
        <Text style={[styles.headerSub, { color: colors.foregroundMuted }]}>
          {isLoading ? "Loading..." : `${activeCount} of ${agents?.length ?? 0} active`}
        </Text>
        <View style={styles.pipelineLegend}>
          {Object.entries(ROLE_CONFIG).map(([key, conf]) => (
            <View key={key} style={[styles.legendItem, { backgroundColor: conf.bg }]}>
              <Feather name={conf.icon} size={12} color={conf.color} />
              <Text style={[styles.legendText, { color: conf.color }]}>{conf.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <AgentSkeleton key={i} index={i} />)
          : (agents ?? [])
              .sort((a, b) => a.pipelineOrder - b.pipelineOrder)
              .map((agent, i) => <AgentCard key={agent.id} agent={agent} index={i} />)}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, zIndex: 10 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 2 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 14 },
  pipelineLegend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  legendText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  agentCard: { borderRadius: 16, overflow: "hidden" },
  agentCardInner: { padding: 18 },
  agentTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  agentIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pipelineBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pipelineText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginLeft: "auto" },
  activeDot: { width: 5, height: 5, borderRadius: 999 },
  activeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  agentNames: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  agentDisplayName: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  roleBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  agentDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 14 },
  agentFooter: { flexDirection: "row", gap: 20, paddingTop: 14, borderTopWidth: 1 },
  agentMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  agentMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  skeletonCard: { borderRadius: 16, borderWidth: 1, padding: 18, flexDirection: "row", gap: 14, marginBottom: 14 },
  skeletonIcon: { width: 44, height: 44, borderRadius: 14 },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 14, borderRadius: 7 },
});
