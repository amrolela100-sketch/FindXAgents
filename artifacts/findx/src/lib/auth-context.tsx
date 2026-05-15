import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { env } from "./env";
import type { Session } from "@supabase/supabase-js";
import { toast } from "../hooks/use-toast";

interface User {
  id: string;
  email: string;
  role: "admin" | "user";
  activeWorkspaceId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const API_BASE = (env.VITE_API_URL ?? "/api").replace(/\/$/, "");

async function mapSessionToDbUser(session: Session): Promise<User> {
  const fallback: User = {
    id:    session.user.id,
    email: session.user.email ?? "",
    role:  "user",
  };

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return fallback;
    const data = await res.json() as {
      user?: { userId?: string; sub?: string; email?: string; role?: "admin" | "user"; activeWorkspaceId?: string };
    };
    return {
      id:                data.user?.userId ?? data.user?.sub ?? fallback.id,
      email:             data.user?.email ?? fallback.email,
      role:              data.user?.role ?? "user",
      activeWorkspaceId: data.user?.activeWorkspaceId,
    };
  } catch (err) {
    toast({
      title: "Failed to sync account",
      description: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      variant: "destructive",
    });
    return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        setUser(await mapSessionToDbUser(session));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (session?.user) {
          setUser(await mapSessionToDbUser(session));
        } else {
          setUser(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
