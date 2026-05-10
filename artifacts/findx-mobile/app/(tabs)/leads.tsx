import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState, useCallback, useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getLeads } from "@/lib/api";
import { STATUS_COLORS, STATUS_BG, STATUS_LABELS } from "@/lib/types";
import type { Lead, LeadStatus } from "@/lib/types";

type FeatherName = ComponentProps<typeof Feather>["name"];
const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "discovered", label: "New" },
  { key: "analyzing", label: "Analyzing" },
  { key: "analyzed", label: "Analyzed" },
  { key: "contacting", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "won", label: "Won" },
];

function LeadCard({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[lead.status];
  const statusBg = STATUS_BG[lead.status];
  const score = lead.leadScore;
  const scoreColor = score === null ? colors.mutedForeground : score >= 80 ? "#047857" : score >= 50 ? "#B45309" : "#DC2626";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderLeftColor: statusColor,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onPress}
      testID={`lead-card-${lead.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={[styles.businessName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {lead.businessName}
          </Text>
          <Text style={[styles.location, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {lead.city}{lead.industry ? ` · ${lead.industry}` : ""}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {score !== null ? (
            <Text style={[styles.score, { color: scoreColor, fontFamily: "PlayfairDisplay_700Bold" }]}>{score}</Text>
          ) : (
            <Text style={[styles.scorePlaceholder, { color: colors.subtle, fontFamily: "Inter_400Regular" }]}>—</Text>
          )}
          <View style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
              {STATUS_LABELS[lead.status]}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        {lead.website && (
          <View style={styles.metaItem}>
            <Feather name={"globe" satisfies FeatherName} size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Website</Text>
          </View>
        )}
        {lead.email && (
          <View style={styles.metaItem}>
            <Feather name={"mail" satisfies FeatherName} size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Email</Text>
          </View>
        )}
        {lead.phone && (
          <View style={styles.metaItem}>
            <Feather name={"phone" satisfies FeatherName} size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Phone</Text>
          </View>
        )}
        <Text style={[styles.sourceText, { color: colors.subtle, fontFamily: "Inter_400Regular" }]}>
          {lead.source}
        </Text>
      </View>
    </Pressable>
  );
}

export default function LeadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const filterKey = useRef(`${search}::${statusFilter}`);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["leads", { search, status: statusFilter, page }],
    queryFn: () => getLeads({ search: search || undefined, status: statusFilter || undefined, page, pageSize: PAGE_SIZE }),
  });

  useEffect(() => {
    if (!data) return;
    const key = `${search}::${statusFilter}`;
    if (filterKey.current !== key || page === 1) {
      filterKey.current = key;
      setAllLeads(data.leads);
    } else {
      setAllLeads(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const newOnes = data.leads.filter(l => !existingIds.has(l.id));
        return [...prev, ...newOnes];
      });
    }
    setTotal(data.total);
  }, [data]);

  const hasMore = allLeads.length < total;

  const resetFilters = useCallback((newSearch: string, newStatus: string) => {
    filterKey.current = `${newSearch}::${newStatus}`;
    setPage(1);
    setAllLeads([]);
  }, []);

  const onFilterPress = useCallback((key: string) => {
    setStatusFilter(key);
    resetFilters(search, key);
  }, [search, resetFilters]);

  const onSearch = useCallback((v: string) => {
    setSearch(v);
    resetFilters(v, statusFilter);
  }, [statusFilter, resetFilters]);

  const onRefresh = useCallback(() => {
    filterKey.current = `${search}::${statusFilter}`;
    setPage(1);
    setAllLeads([]);
    refetch();
  }, [search, statusFilter, refetch]);

  const topPadding = isWeb ? 67 : insets.top;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPadding + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>Leads</Text>
        <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {total} total
        </Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name={"search" satisfies FeatherName} size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Search leads..."
            placeholderTextColor={colors.subtle}
            value={search}
            onChangeText={onSearch}
            testID="leads-search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => onSearch("")}>
              <Feather name={"x" satisfies FeatherName} size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={item => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={[styles.filterBar, { backgroundColor: colors.background }]}
        renderItem={({ item }) => {
          const active = item.key === statusFilter;
          const statusColor = item.key ? STATUS_COLORS[item.key as LeadStatus] : colors.foreground;
          const statusBg = item.key ? STATUS_BG[item.key as LeadStatus] : colors.secondary;
          return (
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? statusBg : colors.card,
                  borderColor: active ? statusColor : colors.border,
                },
              ]}
              onPress={() => onFilterPress(item.key)}
              testID={`filter-${item.key || "all"}`}
            >
              <Text style={[
                styles.filterText,
                {
                  color: active ? statusColor : colors.mutedForeground,
                  fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={allLeads}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 + 16, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading && page === 1} onRefresh={onRefresh} tintColor={colors.foreground} />}
        scrollEnabled={allLeads.length > 0}
        renderItem={({ item }) => (
          <LeadCard
            lead={item}
            onPress={() => router.push({ pathname: "/lead/[id]", params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.foreground} style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name={"users" satisfies FeatherName} size={36} color={colors.subtle} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>No leads found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {search ? "Try a different search" : "Run an agent to discover leads"}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              style={[styles.loadMoreBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setPage(p => p + 1)}
            >
              {isFetching && page > 1 ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <Text style={[styles.loadMoreText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  Load more
                </Text>
              )}
            </Pressable>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 26, marginBottom: 2 },
  count: { fontSize: 13, marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterBar: { maxHeight: 50, borderBottomWidth: 0 },
  filterList: { paddingHorizontal: 16, paddingVertical: 8, gap: 7 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  cardTitle: { flex: 1, marginRight: 12 },
  businessName: { fontSize: 15, marginBottom: 2 },
  location: { fontSize: 12 },
  cardRight: { alignItems: "flex-end", gap: 5 },
  score: { fontSize: 22 },
  scorePlaceholder: { fontSize: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11 },
  sourceText: { marginLeft: "auto", fontSize: 10 },
  loader: { marginTop: 40 },
  emptyState: { alignItems: "center", paddingTop: 70, gap: 10 },
  emptyTitle: { fontSize: 16 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  loadMoreText: { fontSize: 13 },
});
