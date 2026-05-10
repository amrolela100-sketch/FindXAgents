import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { getLead, getAnalyses, getOutreaches, updateOutreach } from "@/lib/api";
import { STATUS_COLORS, STATUS_BG, STATUS_LABELS } from "@/lib/types";
import type { Analysis, Outreach } from "@/lib/types";

type FeatherName = ComponentProps<typeof Feather>["name"];
type Tab = "overview" | "analysis" | "email";

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      style={[
        styles.tabBtn,
        active && { borderBottomColor: colors.foreground, borderBottomWidth: 2 },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.tabBtnText,
          {
            color: active ? colors.foreground : colors.mutedForeground,
            fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface InfoRowProps {
  icon: FeatherName;
  label: string;
  value: string;
  onPress?: () => void;
}

function InfoRow({ icon, label, value, onPress }: InfoRowProps) {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.infoRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={13} color={colors.mutedForeground} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.subtle, fontFamily: "Inter_400Regular" }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: onPress ? "#1D4ED8" : colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onPress && <Feather name={"external-link" satisfies FeatherName} size={13} color={colors.subtle} />}
    </Pressable>
  );
}

function ScoreDisplay({ score }: { score: number }) {
  const color = score >= 80 ? "#047857" : score >= 50 ? "#B45309" : "#DC2626";
  const bg = score >= 80 ? "#ECFDF5" : score >= 50 ? "#FFFBEB" : "#FEF2F2";
  const label = score >= 80 ? "Hot" : score >= 50 ? "Warm" : "Cold";
  return (
    <View style={[styles.scoreDisplay, { backgroundColor: bg, borderColor: color + "44" }]}>
      <Text style={[styles.scoreNum, { color, fontFamily: "PlayfairDisplay_700Bold" }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color, fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
    </View>
  );
}

function AnalysisCard({ analysis }: { analysis: Analysis }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const findings = analysis.findings as Record<string, unknown>;
  const keys = Object.keys(findings).filter(k => {
    const v = findings[k];
    return v !== null && v !== undefined && typeof v !== "object";
  });

  return (
    <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.analysisHeader}>
        <View>
          <Text style={[styles.analysisType, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {analysis.type}
          </Text>
          <Text style={[styles.analysisDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {new Date(analysis.analyzedAt).toLocaleDateString()}
          </Text>
        </View>
        {analysis.score !== null && <ScoreDisplay score={analysis.score} />}
      </View>

      {keys.slice(0, expanded ? keys.length : 4).map(key => (
        <View key={key} style={[styles.findingRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.findingKey, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {key.replace(/_/g, " ")}
          </Text>
          <Text style={[styles.findingVal, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
            {String(findings[key])}
          </Text>
        </View>
      ))}

      {keys.length > 4 && (
        <Pressable onPress={() => setExpanded(e => !e)} style={styles.expandBtn}>
          <Text style={[styles.expandText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            {expanded ? "Show less" : `Show ${keys.length - 4} more`}
          </Text>
          <Feather name={expanded ? ("chevron-up" satisfies FeatherName) : ("chevron-down" satisfies FeatherName)} size={13} color={colors.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

const OUTREACH_STATUS_DATA: Record<string, { color: string; bg: string }> = {
  draft: { color: "#7A756D", bg: "#F0EDE6" },
  sent: { color: "#1D4ED8", bg: "#EFF6FF" },
  opened: { color: "#047857", bg: "#ECFDF5" },
  replied: { color: "#7E22CE", bg: "#FAF5FF" },
  bounced: { color: "#DC2626", bg: "#FEF2F2" },
  failed: { color: "#DC2626", bg: "#FEF2F2" },
  approved: { color: "#B45309", bg: "#FFFBEB" },
  pending_approval: { color: "#B45309", bg: "#FFFBEB" },
  saved: { color: "#7A756D", bg: "#F0EDE6" },
};

const ACTIONABLE_STATUSES = ["draft", "pending_approval"];

function OutreachCard({ outreach, leadId }: { outreach: Outreach; leadId: string }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { color: statusColor, bg: statusBg } = OUTREACH_STATUS_DATA[outreach.status] ?? {
    color: colors.mutedForeground,
    bg: colors.secondary,
  };

  const mutation = useMutation({
    mutationFn: (status: string) => updateOutreach(outreach.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreaches", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    },
  });

  const isActionable = ACTIONABLE_STATUSES.includes(outreach.status);

  return (
    <View style={[styles.outreachCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.outreachHeader}>
        <Text style={[styles.outreachSubject, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
          {outreach.subject}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusBg }]}>
          <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
            {outreach.status.replace(/_/g, " ")}
          </Text>
        </View>
      </View>

      <Pressable onPress={() => setExpanded(e => !e)}>
        <Text
          style={[styles.outreachBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={expanded ? undefined : 3}
        >
          {outreach.body}
        </Text>
        <Text style={[styles.expandText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          {expanded ? "Collapse" : "Read more"}
        </Text>
      </Pressable>

      {(outreach.sentAt || outreach.openedAt || outreach.repliedAt) && (
        <View style={[styles.outreachMeta, { borderTopColor: colors.border }]}>
          {outreach.sentAt && (
            <Text style={[styles.outreachMetaText, { color: colors.subtle, fontFamily: "Inter_400Regular" }]}>
              Sent {new Date(outreach.sentAt).toLocaleDateString()}
            </Text>
          )}
          {outreach.openedAt && (
            <Text style={[styles.outreachMetaText, { color: colors.subtle, fontFamily: "Inter_400Regular" }]}>· Opened</Text>
          )}
          {outreach.repliedAt && (
            <Text style={[styles.outreachMetaText, { color: "#047857", fontFamily: "Inter_500Medium" }]}>· Replied</Text>
          )}
        </View>
      )}

      {isActionable && (
        <View style={[styles.outreachActions, { borderTopColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.approveBtn,
              pressed && { opacity: 0.75 },
              mutation.isPending && { opacity: 0.5 },
            ]}
            onPress={() => mutation.mutate("approved")}
            disabled={mutation.isPending}
            testID="approve-btn"
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name={"check" satisfies FeatherName} size={13} color="#fff" />
                <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>Approve</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.skipBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.75 },
              mutation.isPending && { opacity: 0.5 },
            ]}
            onPress={() => mutation.mutate("saved")}
            disabled={mutation.isPending}
            testID="skip-btn"
          >
            <Feather name={"x" satisfies FeatherName} size={13} color={colors.mutedForeground} />
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Skip</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: leadData, isLoading: leadLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLead(id!),
    enabled: !!id,
  });

  const { data: analysesData, isLoading: analysesLoading } = useQuery({
    queryKey: ["analyses", id],
    queryFn: () => getAnalyses(id!),
    enabled: !!id && activeTab === "analysis",
  });

  const { data: outreachesData, isLoading: outreachesLoading } = useQuery({
    queryKey: ["outreaches", id],
    queryFn: () => getOutreaches(id!),
    enabled: !!id && activeTab === "email",
  });

  const lead = leadData?.lead;
  const analyses = analysesData?.analyses ?? [];
  const outreaches = outreachesData?.outreaches ?? [];
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  if (leadLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.foreground} size="large" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <Feather name={"alert-circle" satisfies FeatherName} size={36} color={colors.subtle} />
        <Text style={[styles.notFound, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Lead not found
        </Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[lead.status];
  const statusBg = STATUS_BG[lead.status];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-btn">
          <Feather name={"arrow-left" satisfies FeatherName} size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.topBarTitle}>
          <Text style={[styles.leadName, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]} numberOfLines={1}>
            {lead.businessName}
          </Text>
          <View style={styles.topBarRow}>
            <View style={[styles.badge, { backgroundColor: statusBg }]}>
              <Text style={[styles.badgeText, { color: statusColor, fontFamily: "Inter_600SemiBold" }]}>
                {STATUS_LABELS[lead.status]}
              </Text>
            </View>
            {lead.city ? (
              <Text style={[styles.leadCity, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {lead.city}
              </Text>
            ) : null}
          </View>
        </View>
        {lead.leadScore !== null && <ScoreDisplay score={lead.leadScore} />}
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TabButton label="Overview" active={activeTab === "overview"} onPress={() => setActiveTab("overview")} />
        <TabButton label="Analysis" active={activeTab === "analysis"} onPress={() => setActiveTab("analysis")} />
        <TabButton label="Emails" active={activeTab === "email"} onPress={() => setActiveTab("email")} />
      </View>

      <ScrollView
        style={[styles.body, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" && (
          <View style={styles.section}>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {lead.city ? <InfoRow icon={"map-pin" satisfies FeatherName} label="City" value={lead.city} /> : null}
              {lead.industry ? <InfoRow icon={"briefcase" satisfies FeatherName} label="Industry" value={lead.industry} /> : null}
              {lead.address ? <InfoRow icon={"home" satisfies FeatherName} label="Address" value={lead.address} /> : null}
              {lead.website ? (
                <InfoRow
                  icon={"globe" satisfies FeatherName}
                  label="Website"
                  value={lead.website}
                  onPress={() => Linking.openURL(lead.website!.startsWith("http") ? lead.website! : `https://${lead.website}`)}
                />
              ) : null}
              {lead.email ? (
                <InfoRow
                  icon={"mail" satisfies FeatherName}
                  label="Email"
                  value={lead.email}
                  onPress={() => Linking.openURL(`mailto:${lead.email}`)}
                />
              ) : null}
              {lead.phone ? (
                <InfoRow
                  icon={"phone" satisfies FeatherName}
                  label="Phone"
                  value={lead.phone}
                  onPress={() => Linking.openURL(`tel:${lead.phone}`)}
                />
              ) : null}
              {lead.kvkNumber ? <InfoRow icon={"hash" satisfies FeatherName} label="KvK Number" value={lead.kvkNumber} /> : null}
              <InfoRow icon={"database" satisfies FeatherName} label="Source" value={lead.source} />
              <InfoRow icon={"calendar" satisfies FeatherName} label="Discovered" value={new Date(lead.discoveredAt).toLocaleDateString()} />
            </View>

            <View style={styles.countsRow}>
              <View style={[styles.countCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.countValue, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  {lead._count?.analyses ?? 0}
                </Text>
                <Text style={[styles.countLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Analyses</Text>
              </View>
              <View style={[styles.countCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.countValue, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  {lead._count?.outreaches ?? 0}
                </Text>
                <Text style={[styles.countLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Emails</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === "analysis" && (
          <View style={styles.section}>
            {analysesLoading ? (
              <ActivityIndicator color={colors.foreground} style={styles.loader} />
            ) : analyses.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name={"bar-chart-2" satisfies FeatherName} size={36} color={colors.subtle} />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>No analyses yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Trigger an analysis from the web app</Text>
              </View>
            ) : (
              analyses.map(a => <AnalysisCard key={a.id} analysis={a} />)
            )}
          </View>
        )}

        {activeTab === "email" && (
          <View style={styles.section}>
            {outreachesLoading ? (
              <ActivityIndicator color={colors.foreground} style={styles.loader} />
            ) : outreaches.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name={"mail" satisfies FeatherName} size={36} color={colors.subtle} />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>No emails yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Generate outreach emails from the web app</Text>
              </View>
            ) : (
              outreaches.map(o => <OutreachCard key={o.id} outreach={o} leadId={id!} />)
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 15 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  topBarTitle: { flex: 1, gap: 5 },
  leadName: { fontSize: 19 },
  topBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  leadCity: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10 },
  scoreDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    gap: 1,
  },
  scoreNum: { fontSize: 20 },
  scoreLabel: { fontSize: 10 },
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
  tabBtnText: { fontSize: 13 },
  body: { flex: 1 },
  section: { gap: 10 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    gap: 10,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, marginBottom: 1 },
  infoValue: { fontSize: 13 },
  countsRow: { flexDirection: "row", gap: 10 },
  countCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 3,
  },
  countValue: { fontSize: 32 },
  countLabel: { fontSize: 12 },
  analysisCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
    gap: 8,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  analysisType: { fontSize: 14, textTransform: "capitalize" },
  analysisDate: { fontSize: 11, marginTop: 2 },
  findingRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  findingKey: { fontSize: 11, width: 100, textTransform: "capitalize" },
  findingVal: { flex: 1, fontSize: 12 },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
  },
  expandText: { fontSize: 12 },
  outreachCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
    gap: 10,
  },
  outreachHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  outreachSubject: { flex: 1, fontSize: 14 },
  outreachBody: { fontSize: 13, lineHeight: 20 },
  outreachMeta: {
    flexDirection: "row",
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  outreachMetaText: { fontSize: 11 },
  outreachActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  approveBtn: {
    backgroundColor: "#047857",
  },
  skipBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    color: "#fff",
  },
  loader: { marginTop: 40 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16 },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
});
