import { Switch, Route, useLocation } from "wouter";
import { Sidebar } from "./components/sidebar";
import { lazy, Suspense, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { WorkspaceProvider } from "./lib/workspace-context";
import { LangProvider, useLang } from "./lib/lang-context";
import { ThemeProvider } from "./lib/theme-context";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { env, isEnvValid, envErrors } from "./lib/env";

// ── Critical path — absolute minimum in main bundle ──────────────────────────
// Only components needed before auth resolves (< 100 ms render).
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
const NotFoundPage = lazy(() => import("./pages/not-found"));

// ── Lazy-loaded pages — split into separate async chunks ─────────────────────
// Every page that isn't needed until the user navigates goes here.
const LandingPage        = lazy(() => import("./pages/LandingPage"));
const HomePage           = lazy(() => import("./pages/HomePage"));
const AgentsPage         = lazy(() => import("./pages/AgentsPage"));
const PipelinePage       = lazy(() => import("./pages/PipelinePage"));
const LeadsPage          = lazy(() => import("./pages/LeadsPage"));
const AgentDetailPage    = lazy(() => import("./pages/AgentDetailPage"));
const AdminPage          = lazy(() => import("./pages/AdminPage"));
const OwnerDashboardPage = lazy(() => import("./pages/OwnerDashboardPage"));
const WorkspacePage      = lazy(() => import("./pages/WorkspacePage"));
const SettingsPage       = lazy(() => import("./pages/SettingsPage"));
const ClientsPage        = lazy(() => import("./pages/ClientsPage"));
const OnboardingPage     = lazy(() => import("./pages/OnboardingPage"));
const TermsPage          = lazy(() => import("./pages/TermsPage"));
const PrivacyPage        = lazy(() => import("./pages/PrivacyPage"));
const HelpPage           = lazy(() => import("./pages/HelpPage"));
const PricingPage        = lazy(() => import("./pages/PricingPage"));

// ── Lazy-loaded global widgets — heavy, only rendered after auth ──────────────
// CommandPalette pulls in cmdk + framer-motion variants.
// ChatWidget is 624 lines of chat logic — not needed at paint time.
const CommandPalette = lazy(() =>
  import("./components/command-palette").then(m => ({ default: m.CommandPalette }))
);
const ChatWidget = lazy(() =>
  import("./components/chat-widget").then(m => ({ default: m.ChatWidget }))
);
const CookieConsent = lazy(() =>
  import("./components/cookie-consent").then(m => ({ default: m.CookieConsent }))
);

function PageSpinner() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
    </div>
  );
}

// Null fallback for widgets that render outside the main viewport
function NullFallback() {
  return null;
}

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
    return (
      <Suspense fallback={<PageSpinner />}>
        <LandingPage />
      </Suspense>
    );
  }

  const isAdmin = user.role === "admin";

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
                <Route path="/help"        component={HelpPage} />
                <Route path="/pricing"     component={PricingPage} />
                <Route path="/onboarding">{() => <OnboardingPage />}</Route>
                {isAdmin && <Route path="/admin" component={AdminPage} />}
                <Route>
                  <Suspense fallback={<PageSpinner />}>
                    <NotFoundPage />
                  </Suspense>
                </Route>
              </Switch>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Global Command Palette — lazy, renders after layout paint */}
      <Suspense fallback={<NullFallback />}>
        <CommandPalette />
      </Suspense>

      {/* AI Customer Support Chat Widget — lazy, renders after layout paint */}
      <Suspense fallback={<NullFallback />}>
        <ChatWidget />
      </Suspense>

          <Suspense fallback={<NullFallback />}>
            <CookieConsent />
          </Suspense>
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
