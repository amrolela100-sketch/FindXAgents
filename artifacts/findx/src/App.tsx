import { Switch, Route, useLocation } from "wouter";
import { Sidebar } from "./components/sidebar";
import HomePage from "./pages/HomePage";
import AgentsPage from "./pages/AgentsPage";
import AgentDetailPage from "./pages/AgentDetailPage";
import PipelinePage from "./pages/PipelinePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import WorkspacePage from "./pages/WorkspacePage";
import AdminPage from "./pages/AdminPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import StitchDesignsPage from "./pages/StitchDesignsPage";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { WorkspaceProvider } from "./lib/workspace-context";
import { useLang } from "./lib/lang-context";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { env, isEnvValid, envErrors } from "./lib/env";
import { AlertTriangle } from "lucide-react";

const ADMIN_EMAILS = (env.VITE_ADMIN_EMAILS ?? "").split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);

function AuthGuard() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) { setOnboardingChecked(true); return; }
    
    const checkOnboarding = async () => {
      try {
        const { supabase } = await import("./lib/supabase");
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const base = env.VITE_API_URL;
        
        const res = await fetch(`${base}/onboarding/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const d = await res.json();
        setOnboardingDone(d.completed === true);
        if (!d.completed) setShowOnboarding(true);
      } catch {
        setOnboardingDone(true);
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkOnboarding();
  }, [user]);


  if (loading || !onboardingChecked) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#7A756D]" />
      </div>
    );
  }

  if (!user) {
    if (location === "/login") return <LoginPage />;
    return <LandingPage />;
  }

  if (showOnboarding && !onboardingDone) {
    return (
      <OnboardingPage
        onComplete={() => {
          setOnboardingDone(true);
          setShowOnboarding(false);
        }}
      />
    );
  }

  const isAdmin = ADMIN_EMAILS.includes((user.email ?? "").toLowerCase()) || user.role === "admin";
  const { isRtl } = useLang();

  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-[#F7F5F0] text-[#1A1A1A]">
        <Sidebar isAdmin={isAdmin} />
        <main className={`${isRtl ? "mr-60" : "ml-60"} min-h-screen`}>
          <ErrorBoundary key={location}>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/login" component={HomePage} />
              <Route path="/agents/:name" component={AgentDetailPage} />
              <Route path="/agents" component={AgentsPage} />
              <Route path="/pipeline" component={PipelinePage} />
              <Route path="/workspaces" component={WorkspacePage} />
              <Route path="/owner" component={OwnerDashboardPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/designs" component={StitchDesignsPage} />
              {isAdmin && <Route path="/admin" component={AdminPage} />}
              <Route>
                <div className="p-8 text-center">
                  <h1 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-2">404</h1>
                  <p className="text-[#7A756D]">Page not found</p>
                </div>
              </Route>
            </Switch>
          </ErrorBoundary>
        </main>
      </div>
    </WorkspaceProvider>
  );
}

export default function App() {
  const [location] = useLocation();

  // Handle OAuth callback before any auth check
  if (location === "/auth/callback" || window.location.pathname.includes("/auth/callback")) {
    return <AuthCallbackPage />;
  }

  return (
    <>
      {!isEnvValid && (
        <div className="bg-red-500 text-white px-4 py-2 text-sm flex flex-col items-center justify-center relative z-50">
          <div className="flex items-center gap-2 font-bold mb-1">
            <AlertTriangle className="w-4 h-4" />
            Environment Configuration Error
          </div>
          <div className="text-red-100 flex gap-4">
            {envErrors.map((err, i) => <span key={i}>{err}</span>)}
          </div>
        </div>
      )}
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </>
  );
}
