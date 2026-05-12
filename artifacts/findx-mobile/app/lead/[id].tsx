import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { StatusBadge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { getLeadM, approveDraftEmail, sendEmail } from "@/lib/api-helpers";
import type { Lead, Analysis, Outreach } from "@/lib/types";

const TABS = ["Overview", "Analysis", "Outreach"] as const;
type Tab = (typeof TABS)[number];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.divider }]}>
      {TABS.map((tab) => {
        const isActive = active === tab;
        return (
          <Pressable key={tab} onPress={() => onChange(tab)} style={styles.tabItem}>
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive ? colors.brand : colors.foregroundMuted,
                  fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {tab}
            </Text>
            {isActive && <View style={[styles.tabIndicator, { backgroundColor: colors.brand }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string | null | undefined;
  last?: boolean;
}) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <View style={[styles.infoIconWrap, { backgroundColor: `${colors.brand}18` }]}>
        <Feather name={icon} size={13} color={colors.brand} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.foregroundMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function OverviewTab({ lead }: { lead: Lead }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.tabContent}>
      <GlassCard noPadding style={styles.infoCard}>
        <InfoRow icon="map-pin" label="Location" value={lead.city} />
        <InfoRow icon="tag" label="Industry" value={lead.industry} />
        <InfoRow icon="globe" label="Website" value={lead.website} />
        <InfoRow icon="phone" label="Phone" value={lead.phone} />
        <InfoRow icon="mail" label="Email" value={lead.email} />
        <InfoRow icon="hash" label="KVK Number" value={lead.kvkNumber} />
        <InfoRow icon="map" label="Address" value={lead.address} />
        <InfoRow icon="database" label="Source" value={lead.source} last />
      </GlassCard>
      <View style={styles.tagRow}>
        {lead.hasWebsite && (
          <View style={[styles.tag, { backgroundColor: colors.statusContactingBg }]}>
            <Feather name="globe" size={11} color={colors.statusContactingText} />
            <Text style={[styles.tagText, { color: colors.statusContactingText }]}>Has Website</Text>
          </View>
        )}
        {lead.email && (
          <View style={[styles.tag, { backgroundColor: colors.statusWonBg }]}>
            <Feather name="mail" size={11} color={colors.statusWonText} />
            <Text style={[styles.tagText, { color: colors.statusWonText }]}>Email Available</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function AnalysisTab({ analyses }: { analyses: Analysis[] | undefined }) {
  const colors = useColors();
  if (!analyses || analyses.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Feather name="bar-chart-2" size={36} color={colors.foregroundSubtle} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No analysis yet</Text>
        <Text style={[styles.emptySub, { color: colors.foregroundMuted }]}>
          Analysis will appear here after the AI agent processes this lead.
        </Text>
      </View>
    );
  }
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.tabContent}>
      {analyses.map((analysis) => (
        <GlassCard key={analysis.id} noPadding style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <View>
              <Text style={[styles.analysisType, { color: colors.foreground }]}>
                {analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1)}
              </Text>
              <Text style={[styles.analysisDate, { color: colors.foregroundMuted }]}>
                {new Date(analysis.analyzedAt).toLocaleDateString()}
              </Text>
            </View>
            {analysis.score !== null && <ScoreRing score={analysis.score} size={56} strokeWidth={4} />}
          </View>
          {analysis.findings && Object.keys(analysis.findings).length > 0 && (
            <View style={styles.findings}>
              <Text style={[styles.findingsTitle, { color: colors.foregroundMuted }]}>Findings</Text>
              {Object.entries(analysis.findings).slice(0, 6).map(([key, val]) => (
                <View key={key} style={styles.findingRow}>
                  <View style={[styles.findingDot, { backgroundColor: colors.brand }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.findingKey, { color: colors.foreground }]}>
                      {key.replace(/_/g, " ")}
                    </Text>
                    {val !== null && val !== undefined && (
                      <Text style={[styles.findingVal, { color: colors.foregroundMuted }]} numberOfLines={3}>
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </GlassCard>
      ))}
    </Animated.View>
  );
}

function OutreachTab({ outreaches, leadId }: { outreaches: Outreach[] | undefined; leadId: string }) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDraftEmail(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead", leadId] }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendEmail(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead", leadId] }),
  });

  if (!outreaches || outreaches.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Feather name="mail" size={36} color={colors.foregroundSubtle} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No outreach yet</Text>
        <Text style={[styles.emptySub, { color: colors.foregroundMuted }]}>
          The Outreach Agent will draft a personalised email when this lead is ready.
        </Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.tabContent}>
      {outreaches.map((outreach) => {
        const isPending = outreach.status === "draft" || outreach.status === "pending_approval";
        const isApproved = outreach.status === "approved";
        const isSent = outreach.status === "sent" || outreach.status === "opened";
        return (
          <GlassCard key={outreach.id} noPadding style={styles.outreachCard}>
            <View style={styles.outreachHeader}>
              <Text style={[styles.outreachSubject, { color: colors.foreground }]}>{outreach.subject}</Text>
              <View style={[styles.outreachStatus, {
                backgroundColor: isSent ? colors.statusWonBg : isApproved ? colors.statusQualifiedBg : isPending ? colors.statusAnalyzingBg : colors.statusDiscoveredBg,
              }]}>
                <Text style={[styles.outreachStatusText, {
                  color: isSent ? colors.statusWonText : isApproved ? colors.statusQualifiedText : isPending ? colors.statusAnalyzingText : colors.foregroundMuted,
                }]}>{outreach.status.replace(/_/g, " ")}</Text>
              </View>
            </View>
            <Text style={[styles.outreachBody, { color: colors.foregroundMuted }]}>{outreach.body}</Text>
            {outreach.sentAt && (
              <Text style={[styles.outreachMeta, { color: colors.foregroundSubtle }]}>
                Sent: {new Date(outreach.sentAt).toLocaleString()}
              </Text>
            )}
            {outreach.openedAt && (
              <Text style={[styles.outreachMeta, { color: colors.success }]}>
                Opened: {new Date(outreach.openedAt).toLocaleString()}
              </Text>
            )}
            {outreach.repliedAt && (
              <Text style={[styles.outreachMeta, { color: colors.statusContactingText }]}>
                Replied: {new Date(outreach.repliedAt).toLocaleString()}
              </Text>
            )}
            {isPending && (
              <View style={styles.outreachActions}>
                <Button label="Approve" variant="secondary" size="sm" onPress={() => approveMutation.mutate(outreach.id)} loading={approveMutation.isPending} />
              </View>
            )}
            {isApproved && (
              <View style={styles.outreachActions}>
                <Button
                  label="Send Email"
                  variant="primary"
                  size="sm"
                  icon={<Feather name="send" size={14} color="#FFF" />}
                  onPress={() => {
                    Alert.alert("Send Email", "Send this email to the lead?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Send", onPress: () => sendMutation.mutate(outreach.id) },
                    ]);
                  }}
                  loading={sendMutation.isPending}
                />
              </View>
            )}
          </GlassCard>
        );
      })}
    </Animated.View>
  );
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => getLeadM(id!),
    enabled: !!id,
  });

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
        {lead && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.headerName}>
                <Text style={[styles.leadName, { color: colors.foreground }]} numberOfLines={1}>{lead.businessName}</Text>
                <Text style={[styles.leadCity, { color: colors.foregroundMuted }]} numberOfLines={1}>
                  {lead.city}{lead.industry ? ` · ${lead.industry}` : ""}
                </Text>
              </View>
              <View style={styles.headerBadges}>
                <StatusBadge status={lead.status} />
                {lead.leadScore !== null && <ScoreRing score={lead.leadScore} size={44} strokeWidth={3.5} />}
              </View>
            </View>
          </Animated.View>
        )}
        <TabBar active={activeTab} onChange={setActiveTab} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : lead ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "Overview" && <OverviewTab lead={lead} />}
          {activeTab === "Analysis" && <AnalysisTab analyses={lead.analyses} />}
          {activeTab === "Outreach" && <OutreachTab outreaches={lead.outreaches} leadId={lead.id} />}
        </ScrollView>
      ) : (
        <View style={styles.emptyTab}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Lead not found</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 0, zIndex: 10 },
  backBtn: { padding: 16, paddingBottom: 8 },
  headerContent: { paddingHorizontal: 20, paddingBottom: 14 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerName: { flex: 1, paddingRight: 12 },
  headerBadges: { alignItems: "flex-end", gap: 8 },
  leadName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 4 },
  leadCity: { fontSize: 13, fontFamily: "Inter_400Regular" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 20 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, position: "relative" },
  tabText: { fontSize: 14 },
  tabIndicator: { position: "absolute", bottom: -1, left: "10%", right: "10%", height: 2, borderRadius: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  loader: { marginTop: 60 },
  tabContent: { gap: 16 },
  infoCard: { borderRadius: 16, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  analysisCard: { borderRadius: 16, overflow: "hidden" },
  analysisHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 16, paddingBottom: 12 },
  analysisType: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  analysisDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  findings: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  findingsTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  findingRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  findingDot: { width: 5, height: 5, borderRadius: 999, marginTop: 6 },
  findingKey: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "capitalize", marginBottom: 2 },
  findingVal: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  outreachCard: { borderRadius: 16, overflow: "hidden", padding: 16 },
  outreachHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  outreachSubject: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, paddingRight: 8 },
  outreachStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  outreachStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  outreachBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 12 },
  outreachMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  outreachActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  emptyTab: { alignItems: "center", paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
