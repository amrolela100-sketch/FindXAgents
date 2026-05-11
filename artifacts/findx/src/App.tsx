import { Switch, Route, useLocation } from "wouter";
import { Sidebar } from "./components/sidebar";
import HomePage from "./pages/HomePage";
import AgentsPage from "./pages/AgentsPage";
import AgentDetailPage from "./pages/AgentDetailPage";
import PipelinePage from "./pages/PipelinePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import WorkspacePage from "./pages/WorkspacePage";
import AdminPage from "./pages/AdminPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import LeadsPage from "./pages/LeadsPage";
import ClientsPage from "./pages/ClientsPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { WorkspaceProvider } from "./lib/workspace-context";
import { LangProvider, useLang } from "./lib/lang-context";
import { ThemeProvider } from "./lib/theme-context";
import { CommandPalette } from "./components/command-palette";
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
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
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
        className="min-h-screen"
        style={{ background: "var(--bg)" }}
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
                  className="min-h-screen flex flex-col items-center justify-center gap-2"
                  style={{ background: "var(--bg)" }}
                >
                  <p className="text-5xl font-bold" style={{ color: "var(--text)" }}>404</p>
                  <p style={{ color: "var(--text-muted)" }}>Page not found</p>
                </div>
              </Route>
            </Switch>
          </ErrorBoundary>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette />
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
          <TermsPage />
        </LangProvider>
      </ThemeProvider>
    );
  }

  if (location === "/privacy") {
    return (
      <ThemeProvider>
        <LangProvider>
          <PrivacyPage />
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
