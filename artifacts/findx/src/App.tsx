import { Switch, Route, useLocation } from "wouter";
import { Sidebar } from "./components/sidebar";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// ── Critical path — always in the main bundle ────────────────────────────────
import HomePage from "./pages/HomePage";
import AgentsPage from "./pages/AgentsPage";
import PipelinePage from "./pages/PipelinePage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import LeadsPage from "./pages/LeadsPage";

// ── Lazy-loaded — split into separate chunks ─────────────────────────────────
// These pages are heavy or admin-only; defer until first navigation.
const AgentDetailPage    = lazy(() => import("./pages/AgentDetailPage"));
const AdminPage          = lazy(() => import("./pages/AdminPage"));
const OwnerDashboardPage = lazy(() => import("./pages/OwnerDashboardPage"));
const WorkspacePage      = lazy(() => import("./pages/WorkspacePage"));
const SettingsPage       = lazy(() => import("./pages/SettingsPage"));
const ClientsPage        = lazy(() => import("./pages/ClientsPage"));
const TermsPage          = lazy(() => import("./pages/TermsPage"));
const PrivacyPage        = lazy(() => import("./pages/PrivacyPage"));

function PageSpinner() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );
}
import { AuthProvider, useAuth } from "./lib/auth-context";
import { WorkspaceProvider } from "./lib/workspace-context";
import { LangProvider, useLang } from "./lib/lang-context";
import { ThemeProvider } from "./lib/theme-context";
import { CommandPalette } from "./components/command-palette";
import { ChatWidget } from "./components/chat-widget";
import { Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { env, isEnvValid, envErrors } from "./lib/env";

const ADMIN_EMAILS = (env.VITE_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

function AuthGuard() {
  const { user, loading } = useAuth();
  const { isRtl } = useLang();
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
          <p className="text-xs" style={{ color: "var(--text-subtle)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (location === "/login") return <LoginPage />;
    return <LandingPage />;
  }

  const isAdmin =
    ADMIN_EMAILS.includes((user.email ?? "").toLowerCase()) ||
    user.role === "admin";

  return (
    <WorkspaceProvider>
      {/* Layout */}
      <div
        className="min-h-[100dvh]"
      >
        <Sidebar
          isAdmin={isAdmin}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        />

        {/* Main area — offset by sidebar on desktop */}
        <div className={
          isRtl
            ? (sidebarCollapsed ? "md:mr-16" : "md:mr-60")
            : (sidebarCollapsed ? "md:ml-16" : "md:ml-60")
        } style={{ transition: "margin 0.3s ease" }}>
          <ErrorBoundary key={location}>
            <Suspense fallback={<PageSpinner />}>
              <Switch>
                <Route path="/"            component={HomePage} />
                <Route path="/login"       component={HomePage} />
                <Route path="/agents/:name" component={AgentDetailPage} />
                <Route path="/agents"      component={AgentsPage} />
                <Route path="/pipeline"    component={PipelinePage} />
                <Route path="/leads"       component={LeadsPage} />
                <Route path="/clients"     component={ClientsPage} />
                <Route path="/workspaces"  component={WorkspacePage} />
                <Route path="/owner"       component={OwnerDashboardPage} />
                <Route path="/settings"    component={SettingsPage} />
                {isAdmin && <Route path="/admin" component={AdminPage} />}
                <Route>
                  <div
                    className="min-h-[100dvh] flex flex-col items-center justify-center gap-2"
                  >
                    <p className="text-5xl font-bold" style={{ color: "var(--text)" }}>404</p>
                    <p style={{ color: "var(--text-muted)" }}>Page not found</p>
                  </div>
                </Route>
              </Switch>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* AI Customer Support Chat Widget */}
      <ChatWidget />
    </WorkspaceProvider>
  );
}

export default function App() {
  const [location] = useLocation();

  if (
    location === "/auth/callback" ||
    window.location.pathname.includes("/auth/callback")
  ) {
    return (
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <AuthCallbackPage />
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    );
  }

  // Legal pages — public, no auth required
  if (location === "/terms") {
    return (
      <ThemeProvider>
        <LangProvider>
          <Suspense fallback={<PageSpinner />}>
            <TermsPage />
          </Suspense>
        </LangProvider>
      </ThemeProvider>
    );
  }

  if (location === "/privacy") {
    return (
      <ThemeProvider>
        <LangProvider>
          <Suspense fallback={<PageSpinner />}>
            <PrivacyPage />
          </Suspense>
        </LangProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          {!isEnvValid && (
            <div className="bg-red-600 text-white px-4 py-2 text-xs flex items-center justify-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Env config error: {envErrors.join(" · ")}</span>
            </div>
          )}
          <AuthGuard />
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
