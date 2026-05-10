import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "./supabase";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icp: string;
  targetIndustry: string;
  targetCity: string;
  createdAt: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  switchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (data: Partial<Workspace>) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const base = (import.meta.env.VITE_API_URL as string) || "/api";
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<{ workspaces: Workspace[]; activeId: string | null }>("/workspaces");
      setWorkspaces(data.workspaces ?? []);
      setActiveId(data.activeId ?? null);
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchWorkspace = useCallback(async (id: string) => {
    const data = await fetchApi<{ activeId: string }>(`/workspaces/${id}/switch`, { method: "POST" });
    setActiveId(data.activeId);
  }, []);

  const createWorkspace = useCallback(async (body: Partial<Workspace>): Promise<Workspace> => {
    const data = await fetchApi<{ workspace: Workspace }>("/workspaces", { method: "POST", body: JSON.stringify(body) });
    await refresh();
    return data.workspace;
  }, [refresh]);

  const updateWorkspace = useCallback(async (id: string, body: Partial<Workspace>) => {
    await fetchApi(`/workspaces/${id}`, { method: "PUT", body: JSON.stringify(body) });
    await refresh();
  }, [refresh]);

  const deleteWorkspace = useCallback(async (id: string) => {
    await fetchApi(`/workspaces/${id}`, { method: "DELETE" });
    await refresh();
  }, [refresh]);

  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0] ?? null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, loading, error, refresh, switchWorkspace, createWorkspace, updateWorkspace, deleteWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be inside WorkspaceProvider");
  return ctx;
}
