"use client";

import { DEMO_TS } from "@/lib/demo-clock";

export const WORKSPACE_STORAGE_KEY = "worksphere.workspace.snapshot.v1";

export interface WorkspaceSnapshot {
  version: 1;
  savedAt: string;
  workspaceId: string;
  workspaces?: unknown;
  projects: unknown;
  tasks: unknown;
  milestones: unknown;
  documents: unknown;
  comments: unknown;
  submissions: unknown;
  activity: unknown;
  opportunities: unknown;
  quotations: unknown;
  assignments: unknown;
  workSubmissions: unknown;
  threads: unknown;
  messages: unknown;
  invoices: unknown;
  earnings: unknown;
  portalNotifications: unknown;
  developers: unknown;
  saved: unknown;
  clients: unknown;
  team: unknown;
  searchQuery?: string;
}

export function loadWorkspaceSnapshot(): WorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceSnapshot;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkspaceSnapshot(snapshot: Omit<WorkspaceSnapshot, "version" | "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: WorkspaceSnapshot = {
      ...snapshot,
      version: 1,
      savedAt: DEMO_TS,
    };
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota
  }
}

export function clearWorkspaceSnapshot() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
}
