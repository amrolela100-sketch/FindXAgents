import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getWorkspaces, getApiKeys } from "@/lib/api-helpers";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foregroundMuted }]}>{title}</Text>
      <GlassCard noPadding style={styles.sectionCard}>{children}</GlassCard>
    </Animated.View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  last,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
        <View style={[styles.rowIcon, { backgroundColor: danger ? colors.runFailedBg : `${colors.brand}18` }]}>
          <Feather name={icon} size={15} color={danger ? colors.danger : colors.brand} />
        </View>
        <Text style={[styles.rowLabel, { color: danger ? colors.danger : colors.foreground }]}>{label}</Text>
        <View style={styles.rowRight}>
          {value && <Text style={[styles.rowValue, { color: colors.foregroundMuted }]} numberOfLines={1}>{value}</Text>}
          {onPress && <Feather name="chevron-right" size={16} color={colors.foregroundSubtle} />}
        </View>
      </View>
    </Pressable>
  );
}

function ApiKeyRow({
  label,
  icon,
  keyValue,
  last,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  keyValue?: string | null;
  last?: boolean;
}) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  const display = keyValue
    ? revealed
      ? keyValue
      : `${keyValue.slice(0, 6)}${"•".repeat(Math.min(20, keyValue.length - 6))}`
    : "Not set";

  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <View style={[styles.rowIcon, { backgroundColor: `${colors.brand}18` }]}>
        <Feather name={icon} size={15} color={colors.brand} />
      </View>
      <View style={styles.apiKeyInfo}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        <Text
          style={[
            styles.apiKeyValue,
            { color: keyValue ? colors.foregroundMuted : colors.statusLostText, fontFamily: "Inter_400Regular" },
          ]}
          numberOfLines={1}
        >
          {display}
        </Text>
      </View>
      {keyValue && (
        <Pressable onPress={() => setRevealed((r) => !r)}>
          <Feather name={revealed ? "eye-off" : "eye"} size={16} color={colors.foregroundSubtle} />
        </Pressable>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const router = useRouter();

  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces, staleTime: 120_000 });
  const { data: apiKeys } = useQuery({ queryKey: ["apiKeys"], queryFn: getApiKeys, staleTime: 120_000 });

  const isAdmin = (user?.user_metadata?.role ?? "") === "admin";
  const name: string = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "User";
  const email: string = user?.email ?? "";
  const initial = name.charAt(0).toUpperCase();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const bgColors = colors.isDark
    ? (["#080810", "#0D0C1E"] as const)
    : (["#E8E6F4", "#F0EFF8"] as const);

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
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBackground, borderBottomColor: colors.divider, borderBottomWidth: 1 }]}
          />
        )}
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <GlassCard glow style={styles.userCard} noPadding>
            <View style={styles.userCardInner}>
              <LinearGradient colors={[colors.brandGradientStart, colors.brandGradientEnd]} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </LinearGradient>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{name}</Text>
                <Text style={[styles.userEmail, { color: colors.foregroundMuted }]}>{email}</Text>
                {isAdmin && (
                  <View style={[styles.adminBadge, { backgroundColor: `${colors.brand}22` }]}>
                    <Feather name="shield" size={11} color={colors.brand} />
                    <Text style={[styles.adminText, { color: colors.brand }]}>Admin</Text>
                  </View>
                )}
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Workspaces */}
        {workspaces && workspaces.length > 0 && (
          <Section title="Workspaces">
            {workspaces.map((ws, i) => (
              <Row key={ws.id} icon="briefcase" label={ws.name} value={ws.role} last={i === workspaces.length - 1} />
            ))}
          </Section>
        )}

        {/* API Keys */}
        <Section title="API Keys">
          <ApiKeyRow label="Tavily API" icon="search" keyValue={apiKeys?.tavily} />
          <ApiKeyRow label="Resend API" icon="send" keyValue={apiKeys?.resend} last />
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row icon="settings" label="Settings" onPress={() => {}} />
          <Row icon="help-circle" label="Help & Support" onPress={() => {}} />
          <Row icon="info" label="About FindX" value="v1.0.0" last />
        </Section>

        {/* Admin */}
        {isAdmin && (
          <Section title="Admin">
            <Row icon="users" label="Manage Users" onPress={() => {}} />
            <Row icon="activity" label="System Logs" onPress={() => {}} last />
          </Section>
        )}

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.signOutSection}>
          <Button
            label="Sign Out"
            variant="danger"
            onPress={handleSignOut}
            icon={<Feather name="log-out" size={16} color="#FFF" />}
            fullWidth
          />
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, zIndex: 10 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  userCard: { borderRadius: 18, overflow: "hidden", marginBottom: 24 },
  userCardInner: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFF" },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start", marginTop: 4 },
  adminText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 13, fontFamily: "Inter_400Regular", maxWidth: 120 },
  apiKeyInfo: { flex: 1 },
  apiKeyValue: { fontSize: 12, marginTop: 1 },
  signOutSection: { marginTop: 8, marginBottom: 16 },
});
