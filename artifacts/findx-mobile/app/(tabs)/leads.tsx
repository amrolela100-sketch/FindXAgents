import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useColors } from "@/hooks/useColors";
import { getLeadsM } from "@/lib/api-helpers";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUS_FILTERS: { label: string; value: LeadStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "discovered" },
  { label: "Analyzing", value: "analyzing" },
  { label: "Analyzed", value: "analyzed" },
  { label: "Contacted", value: "contacting" },
  { label: "Responded", value: "responded" },
  { label: "Qualified", value: "qualified" },
  { label: "Won", value: "won" },
  { label: "Lost", value: "lost" },
];

function getStatusChipColor(status: LeadStatus | "all", colors: ReturnType<typeof useColors>) {
  switch (status) {
    case "won": return { text: colors.statusWonText, bg: colors.statusWonBg };
    case "qualified": return { text: colors.statusQualifiedText, bg: colors.statusQualifiedBg };
    case "contacting": return { text: colors.statusContactingText, bg: colors.statusContactingBg };
    case "responded": return { text: colors.statusRespondedText, bg: colors.statusRespondedBg };
    case "analyzed": return { text: colors.statusAnalyzedText, bg: colors.statusAnalyzedBg };
    case "analyzing": return { text: colors.statusAnalyzingText, bg: colors.statusAnalyzingBg };
    case "lost": return { text: colors.statusLostText, bg: colors.statusLostBg };
    case "discovered": return { text: colors.statusDiscoveredText, bg: colors.statusDiscoveredBg };
    default: return { text: colors.brand, bg: `${colors.brand}18` };
  }
}

function getBorderColor(status: LeadStatus, colors: ReturnType<typeof useColors>): string {
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

// ── Lead Card ──────────────────────────────────────────────────────────────

function LeadCard({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const colors = useColors();
  const borderColor = getBorderColor(lead.status, colors);

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <GlassCard
        style={[styles.leadCard, { borderLeftColor: borderColor }]}
        onPress={onPress}
        noPadding
      >
        <View style={styles.leadCardInner}>
          <ScoreRing score={lead.leadScore} size={48} strokeWidth={3.5} />
          <View style={styles.leadInfo}>
            <Text style={[styles.leadName, { color: colors.foreground }]} numberOfLines={1}>
              {lead.businessName}
            </Text>
            <Text style={[styles.leadCity, { color: colors.foregroundMuted }]} numberOfLines={1}>
              {lead.city}{lead.industry ? ` · ${lead.industry}` : ""}
            </Text>
            <View style={styles.leadMeta}>
              {lead.website && (
                <View style={styles.metaChip}>
                  <Feather name="globe" size={10} color={colors.info} />
                  <Text style={[styles.metaText, { color: colors.info }]}>Web</Text>
                </View>
              )}
              {lead.email && (
                <View style={styles.metaChip}>
                  <Feather name="mail" size={10} color={colors.success} />
                  <Text style={[styles.metaText, { color: colors.success }]}>Email</Text>
                </View>
              )}
              {lead.phone && (
                <View style={styles.metaChip}>
                  <Feather name="phone" size={10} color={colors.foregroundSubtle} />
                  <Text style={[styles.metaText, { color: colors.foregroundSubtle }]}>Phone</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.leadRight}>
            <StatusBadge status={lead.status} />
            <Feather name="chevron-right" size={16} color={colors.foregroundSubtle} />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ── Leads Screen ───────────────────────────────────────────────────────────

export default function LeadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["leads-infinite", statusFilter, search],
    queryFn: ({ pageParam = 1 }) =>
      getLeadsM({
        page: pageParam as number,
        pageSize: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
      }),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30_000,
  });

  const allLeads = data?.pages.flatMap((p) => p.leads) ?? [];

  const bgColors = colors.isDark
    ? (["#080810", "#0D0C1E"] as const)
    : (["#E8E6F4", "#F0EFF8"] as const);

  const renderItem = useCallback(
    ({ item }: { item: Lead }) => (
      <LeadCard lead={item} onPress={() => router.push(`/lead/${item.id}`)} />
    ),
    [router]
  );

  const renderFooter = () =>
    isFetchingNextPage ? (
      <ActivityIndicator color={colors.brand} style={styles.footerLoader} />
    ) : null;

  const renderEmpty = () => {
    if (isLoading) return <ActivityIndicator color={colors.brand} style={styles.centerLoader} />;
    return (
      <View style={styles.emptyState}>
        <Feather name="users" size={40} color={colors.foregroundSubtle} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No leads found</Text>
        <Text style={[styles.emptySub, { color: colors.foregroundMuted }]}>
          {search ? "Try a different search term" : "Start a run to discover leads"}
        </Text>
      </View>
    );
  };

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Leads</Text>
        <Text style={[styles.headerSub, { color: colors.foregroundMuted }]}>
          {data?.pages[0]?.total ?? 0} total
        </Text>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Feather name="search" size={16} color={colors.foregroundSubtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads..."
            placeholderTextColor={colors.foregroundSubtle}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.foregroundSubtle} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Status filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={STATUS_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => {
            const chipColors = getStatusChipColor(item.value, colors);
            const active = statusFilter === item.value;
            return (
              <Pressable onPress={() => setStatusFilter(item.value)}>
                <View
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? chipColors.bg : colors.glassBackground,
                      borderColor: active ? chipColors.text : colors.glassBorder,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? chipColors.text : colors.foregroundMuted },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={allLeads}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, zIndex: 10 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 2 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filtersContainer: { marginVertical: 12 },
  filtersList: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  leadCard: { borderRadius: 14, overflow: "hidden", borderLeftWidth: 3 },
  leadCardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  leadCity: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6 },
  leadMeta: { flexDirection: "row", gap: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  leadRight: { alignItems: "flex-end", gap: 8 },
  centerLoader: { marginTop: 60 },
  footerLoader: { marginVertical: 20 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
