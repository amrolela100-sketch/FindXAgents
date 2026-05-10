import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  Image, TextInput, ScrollView, Alert, Modal, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  getSearchConfig, saveSearchConfig, deleteSearchConfig, testSearchConfig,
  getResendConfig, saveResendConfig, deleteResendConfig,
  getWorkspaces, createWorkspace, switchWorkspace, deleteWorkspace,
  getAdminStats, getAdminUsers,
  type SearchConfigResponse, type ResendConfigResponse,
  type Workspace, type AdminStats, type AdminUser,
} from "@/lib/api";

const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

function SectionHeader({ label }: { label: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {label}
    </Text>
  );
}

function WorkspaceSection({ userId }: { userId: string }) {
  const colors = useColors();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcp, setNewIcp] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data.workspaces);
      setActiveId(data.activeId);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSwitch = async (id: string) => {
    try {
      await switchWorkspace(id);
      setActiveId(id);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to switch");
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createWorkspace({ name: newName.trim(), icp: newIcp.trim() });
      setNewName(""); setNewIcp("");
      setShowModal(false);
      await load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create");
    } finally { setCreating(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete", `Are you sure you want to delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteWorkspace(id); await load(); }
        catch (err) { Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete"); }
      }},
    ]);
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <Feather name="briefcase" size={16} color={colors.foreground} />
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Workspaces</Text>
          <Pressable onPress={() => setShowModal(true)} style={[styles.tinyBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="plus" size={12} color={colors.foreground} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginTop: 8 }} />
        ) : workspaces.length === 0 ? (
          <Pressable onPress={() => setShowModal(true)}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No workspaces yet. Tap to create one.
            </Text>
          </Pressable>
        ) : (
          workspaces.map((ws) => (
            <View key={ws.id} style={[styles.wsRow, { borderTopColor: colors.border }]}>
              <View style={[styles.wsActive, { backgroundColor: activeId === ws.id ? "#22C55E" : colors.border }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.wsName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{ws.name}</Text>
                {ws.targetIndustry ? <Text style={[styles.wsDetail, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{ws.targetIndustry}</Text> : null}
              </View>
              <View style={styles.wsActions}>
                {activeId !== ws.id && (
                  <Pressable onPress={() => handleSwitch(ws.id)} style={[styles.iconBtn, { borderColor: colors.border }]}>
                    <Feather name="check" size={12} color={colors.foreground} />
                  </Pressable>
                )}
                <Pressable onPress={() => handleDelete(ws.id, ws.name)} style={[styles.iconBtn, { borderColor: "#fca5a5" }]}>
                  <Feather name="trash-2" size={12} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>New workspace</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="e.g. Enterprise NL Q3"
                placeholderTextColor={colors.mutedForeground}
                value={newName}
                onChangeText={setNewName}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>ICP (optional)</Text>
              <TextInput
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="Describe your ideal customer profile..."
                placeholderTextColor={colors.mutedForeground}
                value={newIcp}
                onChangeText={setNewIcp}
              />
            </View>
            <Pressable
              onPress={handleCreate}
              disabled={creating || !newName.trim()}
              style={[styles.primaryBtn, { opacity: creating || !newName.trim() ? 0.5 : 1 }]}
            >
              {creating ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.primaryBtnText}>Create</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function AdminSection() {
  const colors = useColors();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"stats" | "users">("stats");

  const load = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([getAdminStats(), getAdminUsers()]);
      setStats(s.stats);
      setUsers(u.users);
    } catch { } finally { setLoading(false); }
  };

  const toggle = () => {
    if (!expanded && !stats) load();
    setExpanded((v) => !v);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={toggle} style={styles.cardTitleRow}>
        <Feather name="shield" size={16} color="#D97706" />
        <Text style={[styles.cardTitle, { color: "#D97706", fontFamily: "Inter_600SemiBold" }]}>Admin Dashboard</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
      </Pressable>

      {expanded && (
        loading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginTop: 12 }} />
        ) : (
          <>
            {/* Tab strip */}
            <View style={[styles.tabStrip, { backgroundColor: colors.secondary, marginTop: 12 }]}>
              {(["stats", "users"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tabBtn, { backgroundColor: tab === t ? colors.background : "transparent" }]}
                >
                  <Text style={[styles.tabBtnText, { color: tab === t ? colors.foreground : colors.mutedForeground, fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {t === "stats" ? "Overview" : "Users"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {tab === "stats" && stats && (
              <View style={{ gap: 8, marginTop: 12 }}>
                {[
                  { label: "Users", value: stats.totalUsers, icon: "users" as const },
                  { label: "Leads generated", value: stats.totalLeads, icon: "trending-up" as const },
                  { label: "Agent runs", value: stats.totalRuns, icon: "zap" as const },
                ].map(({ label, value, icon }) => (
                  <View key={label} style={[styles.statRow, { borderTopColor: colors.border }]}>
                    <Feather name={icon} size={14} color={colors.mutedForeground} />
                    <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
                    <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{value}</Text>
                  </View>
                ))}
              </View>
            )}

            {tab === "users" && (
              <FlatList
                data={users}
                keyExtractor={(u) => u.id}
                scrollEnabled={false}
                style={{ marginTop: 12 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
                renderItem={({ item: u }) => (
                  <View style={styles.userRow}>
                    {u.avatar ? (
                      <Image source={{ uri: u.avatar }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatarFallback, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.userAvatarLetter, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{u.name[0]?.toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName2, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{u.name}</Text>
                      <Text style={[styles.userEmail2, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{u.email}</Text>
                    </View>
                    <View style={styles.userMeta}>
                      <Text style={[styles.userLeads, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{u.leadCount}</Text>
                      <Text style={[styles.userLeadsLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>leads</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </>
        )
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const [searchConfig, setSearchConfig] = useState<SearchConfigResponse | null>(null);
  const [searchKey, setSearchKey] = useState("");
  const [searchSaving, setSearchSaving] = useState(false);
  const [searchTesting, setSearchTesting] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);

  const [resendConfig, setResendConfig] = useState<ResendConfigResponse | null>(null);
  const [resendKey, setResendKey] = useState("");
  const [resendFrom, setResendFrom] = useState("");
  const [resendSaving, setResendSaving] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  useEffect(() => {
    if (user) {
      getSearchConfig().then(setSearchConfig).catch(() => {});
      getResendConfig().then(setResendConfig).catch(() => {});
    }
  }, [user]);

  const handleSignIn = async () => {
    setLoading(true);
    try { await signInWithGoogle(); } finally { setLoading(false); }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try { await signOut(); } finally { setLoading(false); }
  };

  const handleSaveSearch = async () => {
    if (!searchKey.trim()) return;
    setSearchSaving(true);
    try {
      const data = await saveSearchConfig({ apiKey: searchKey, provider: "tavily" });
      setSearchConfig(data);
      setSearchKey("");
      setShowSearchForm(false);
      Alert.alert("Saved", "Tavily API key saved.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally { setSearchSaving(false); }
  };

  const handleTestSearch = async () => {
    setSearchTesting(true);
    try {
      const res = await testSearchConfig();
      Alert.alert(res.ok ? "✓ Connection OK" : "Error", res.ok ? (res.message ?? "Tavily is working correctly.") : (res.error ?? "Test failed"));
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Test failed");
    } finally { setSearchTesting(false); }
  };

  const handleDeleteSearch = async () => {
    Alert.alert("Delete", "Are you sure you want to remove the Tavily key?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteSearchConfig(); setSearchConfig({ configured: false }); setShowSearchForm(false); }
        catch (err) { Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete"); }
      }},
    ]);
  };

  const handleSaveResend = async () => {
    if (!resendKey.trim() || !resendFrom.trim()) return;
    setResendSaving(true);
    try {
      const data = await saveResendConfig({ apiKey: resendKey, fromEmail: resendFrom });
      setResendConfig(data);
      setResendKey(""); setResendFrom("");
      setShowResendForm(false);
      Alert.alert("Saved", "Resend API key saved.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to save");
    } finally { setResendSaving(false); }
  };

  const handleDeleteResend = async () => {
    Alert.alert("Delete", "Are you sure you want to remove the Resend key?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteResendConfig(); setResendConfig({ configured: false }); setShowResendForm(false); }
        catch (err) { Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete"); }
      }},
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
        <View style={[styles.logoBox, { backgroundColor: colors.foreground }]}>
          <Text style={styles.logoText}>FX</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlayfairDisplay_700Bold" }]}>FindX</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to continue</Text>
        <Pressable onPress={handleSignIn} disabled={loading} style={[styles.googleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading
            ? <ActivityIndicator color={colors.mutedForeground} />
            : <><Feather name="chrome" size={18} color={colors.mutedForeground} /><Text style={[styles.googleBtnText, { color: colors.foreground }]}>Sign in with Google</Text></>
          }
        </Pressable>
      </View>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "User";
  const isAdmin = ADMIN_EMAILS.includes((user.email ?? "").toLowerCase());

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      {/* Profile card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.avatarRow}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.muted }]}>
                <Text style={[styles.avatarLetter, { color: colors.foreground }]}>{name[0].toUpperCase()}</Text>
              </View>
            )
          }
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{name}</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
          </View>
        </View>
      </View>

      {/* Workspaces */}
      <SectionHeader label="WORKSPACES" />
      <WorkspaceSection userId={user.id} />

      {/* API settings */}
      <SectionHeader label="API SETTINGS" />

      {/* Tavily Search */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelRow}>
            <Text style={styles.settingIcon}>🔍</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Tavily Search</Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                {searchConfig?.configured
                  ? (searchConfig.source === "env" ? "Configured via environment" : "Configured via database")
                  : "Not configured"}
              </Text>
            </View>
          </View>
          <View style={styles.settingActions}>
            {searchConfig?.configured && (
              <Pressable onPress={handleTestSearch} disabled={searchTesting} style={[styles.iconBtn, { borderColor: colors.border }]}>
                {searchTesting ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : <Feather name="zap" size={14} color={colors.mutedForeground} />}
              </Pressable>
            )}
            <Pressable onPress={() => setShowSearchForm(!showSearchForm)} style={[styles.smallBtn, { backgroundColor: colors.muted }]}>
              <Text style={[styles.smallBtnText, { color: colors.foreground }]}>
                {showSearchForm ? "Cancel" : searchConfig?.configured ? "Update" : "Set up"}
              </Text>
            </Pressable>
          </View>
        </View>
        {showSearchForm && (
          <View style={[styles.formSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>API key</Text>
            <TextInput
              value={searchKey} onChangeText={setSearchKey}
              placeholder={searchConfig?.configured ? "New key to update..." : "tvly-xxxxxxxxxxxx"}
              placeholderTextColor={colors.mutedForeground} secureTextEntry
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />
            <View style={styles.formActions}>
              <Pressable onPress={handleSaveSearch} disabled={searchSaving || !searchKey.trim()} style={[styles.primaryBtn, { opacity: searchSaving || !searchKey.trim() ? 0.5 : 1 }]}>
                {searchSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.primaryBtnText}>Save</Text>}
              </Pressable>
              {searchConfig?.configured && searchConfig.source !== "env" && (
                <Pressable onPress={handleDeleteSearch} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>Delete</Text></Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Resend Email */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelRow}>
            <Text style={styles.settingIcon}>📧</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Resend E-mail</Text>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                {resendConfig?.configured
                  ? (resendConfig.source === "env" ? "Configured via environment" : `From: ${resendConfig.fromEmail ?? "–"}`)
                  : "Not configured"}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => setShowResendForm(!showResendForm)} style={[styles.smallBtn, { backgroundColor: colors.muted }]}>
            <Text style={[styles.smallBtnText, { color: colors.foreground }]}>
              {showResendForm ? "Cancel" : resendConfig?.configured ? "Update" : "Set up"}
            </Text>
          </Pressable>
        </View>
        {showResendForm && (
          <View style={[styles.formSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>API key</Text>
            <TextInput
              value={resendKey} onChangeText={setResendKey}
              placeholder={resendConfig?.configured ? "New key to update..." : "re_xxxxxxxxxxxx"}
              placeholderTextColor={colors.mutedForeground} secureTextEntry
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, marginTop: 10 }]}>From email address</Text>
            <TextInput
              value={resendFrom} onChangeText={setResendFrom}
              placeholder={resendConfig?.fromEmail ?? "noreply@yourdomain.com"}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address" autoCapitalize="none"
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />
            <View style={styles.formActions}>
              <Pressable onPress={handleSaveResend} disabled={resendSaving || !resendKey.trim() || !resendFrom.trim()} style={[styles.primaryBtn, { opacity: resendSaving || !resendKey.trim() || !resendFrom.trim() ? 0.5 : 1 }]}>
                {resendSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.primaryBtnText}>Save</Text>}
              </Pressable>
              {resendConfig?.configured && resendConfig.source !== "env" && (
                <Pressable onPress={handleDeleteResend} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>Delete</Text></Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Admin section - only for admins */}
      {isAdmin && (
        <>
          <SectionHeader label="PLATFORM MANAGEMENT" />
          <AdminSection />
        </>
      )}

      {/* Sign out */}
      <Pressable onPress={handleSignOut} disabled={loading} style={[styles.signOutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {loading
          ? <ActivityIndicator color={colors.mutedForeground} />
          : <><Feather name="log-out" size={16} color="#ef4444" /><Text style={styles.signOutText}>Sign out</Text></>
        }
      </Pressable>

      <Text style={[styles.version, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>FindX v0.2.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  logoBox: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  logoText: { color: "white", fontSize: 20, fontWeight: "700" },
  title: { fontSize: 28, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  googleBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, minWidth: 220, justifyContent: "center" },
  googleBtnText: { fontSize: 15, fontWeight: "600" },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 0 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14 },
  tinyBtn: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", marginLeft: "auto" },
  emptyText: { fontSize: 13, marginTop: 8, lineHeight: 20 },

  wsRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, marginTop: 10, borderTopWidth: 1 },
  wsActive: { width: 8, height: 8, borderRadius: 4 },
  wsName: { fontSize: 13 },
  wsDetail: { fontSize: 11, marginTop: 1 },
  wsActions: { flexDirection: "row", gap: 6 },

  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 20, fontWeight: "700" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "600" },
  userEmail: { fontSize: 13, marginTop: 2 },

  sectionHeader: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginTop: 4, marginBottom: -4, paddingHorizontal: 4 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  settingLabelRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  settingIcon: { fontSize: 20 },
  settingTitle: { fontSize: 14, fontWeight: "600" },
  settingDesc: { fontSize: 12, marginTop: 1 },
  settingActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { fontSize: 12, fontWeight: "600" },
  formSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 4 },
  inputLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { height: 90, textAlignVertical: "top" },
  formActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  primaryBtn: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "white", fontSize: 14, fontWeight: "600" },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#fca5a5", alignItems: "center", justifyContent: "center" },
  deleteBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "600" },

  inputGroup: { gap: 6 },

  tabStrip: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 2 },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center" },
  tabBtnText: { fontSize: 12 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopWidth: 1 },
  statLabel: { flex: 1, fontSize: 13 },
  statValue: { fontSize: 15 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  userAvatar: { width: 36, height: 36, borderRadius: 18 },
  userAvatarFallback: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  userAvatarLetter: { fontSize: 14 },
  userName2: { fontSize: 13 },
  userEmail2: { fontSize: 11, marginTop: 1 },
  userMeta: { alignItems: "center" },
  userLeads: { fontSize: 15 },
  userLeadsLabel: { fontSize: 10 },

  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, justifyContent: "center", marginTop: 8 },
  signOutText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  version: { fontSize: 11, textAlign: "center", marginTop: 4 },

  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 22 },
});
