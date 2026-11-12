"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEMO_PASSWORD,
  findDemoAccount,
  isValidEmail,
} from "@/lib/demo-credentials";
import {
  clearSessionStorage,
  createSession,
  isSessionValid,
  portalHome,
  readSessionFromStorage,
  writeSessionToStorage,
  type AuthSession,
} from "@/lib/auth-session";
import type { AppRole, PortalKind, SessionUser } from "@/lib/portal-types";

export type PermissionAction =
  | "view_internal_notes"
  | "view_developer_private"
  | "edit_internal_budget"
  | "approve_client_deliverable"
  | "browse_marketplace"
  | "submit_work"
  | "approve_own_submission"
  | "manage_opportunities";

const rolePermissions: Record<AppRole, PermissionAction[]> = {
  super_admin: [
    "view_internal_notes",
    "view_developer_private",
    "edit_internal_budget",
    "approve_client_deliverable",
    "browse_marketplace",
    "submit_work",
    "manage_opportunities",
  ],
  tenant_admin: [
    "view_internal_notes",
    "view_developer_private",
    "edit_internal_budget",
    "approve_client_deliverable",
    "browse_marketplace",
    "manage_opportunities",
  ],
  project_manager: [
    "view_internal_notes",
    "view_developer_private",
    "edit_internal_budget",
    "approve_client_deliverable",
    "manage_opportunities",
  ],
  internal_member: ["view_internal_notes", "submit_work"],
  client: ["approve_client_deliverable"],
  developer: ["browse_marketplace", "submit_work"],
};

export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

interface AuthStoreValue {
  user: SessionUser | null;
  session: AuthSession | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    portal: PortalKind,
    remember: boolean
  ) => Promise<LoginResult>;
  logout: () => void;
  can: (action: PermissionAction) => boolean;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; message: string }>;
}

const AuthContext = createContext<AuthStoreValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const existing = readSessionFromStorage();
    setSession(existing);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      clearSessionStorage();
      setSession(null);
      return;
    }
    const timer = window.setTimeout(() => {
      clearSessionStorage();
      setSession(null);
      router.replace("/login?reason=expired");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [session, router]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      portal: PortalKind,
      remember: boolean
    ): Promise<LoginResult> => {
      await new Promise((r) => setTimeout(r, 450));

      if (!email.trim() || !password) {
        return { ok: false, error: "Email and password are required." };
      }
      if (!isValidEmail(email)) {
        return { ok: false, error: "Enter a valid email address." };
      }

      const account = findDemoAccount(email);
      if (!account || account.password !== password) {
        return { ok: false, error: "Invalid email or password." };
      }
      if (account.portal !== portal) {
        return {
          ok: false,
          error: `This account belongs to the ${account.portal} portal. Select the correct portal to continue.`,
        };
      }

      const next = createSession(account.user, remember);
      writeSessionToStorage(next);
      setSession(next);
      return { ok: true, user: account.user };
    },
    []
  );

  const logout = useCallback(() => {
    clearSessionStorage();
    setSession(null);
    router.replace("/login");
  }, [router]);

  const can = useCallback(
    (action: PermissionAction) => {
      if (!session?.user) return false;
      return rolePermissions[session.user.role].includes(action);
    },
    [session]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await new Promise((r) => setTimeout(r, 400));
    if (!email.trim()) {
      return { ok: false, message: "Email is required." };
    }
    if (!isValidEmail(email)) {
      return { ok: false, message: "Enter a valid email address." };
    }
    const account = findDemoAccount(email);
    if (!account) {
      return {
        ok: true,
        message:
          "If this email is registered, a reset link would be sent. Demo mode: no email is actually delivered.",
      };
    }
    return {
      ok: true,
      message: `Demo reset for ${account.email}. Use password “${DEMO_PASSWORD}” to sign in. No email was sent.`,
    };
  }, []);

  const value = useMemo<AuthStoreValue>(
    () => ({
      user: session?.user ?? null,
      session,
      hydrated,
      isAuthenticated: isSessionValid(session),
      login,
      logout,
      can,
      requestPasswordReset,
    }),
    [session, hydrated, login, logout, can, requestPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Use inside AuthGuard-protected trees where a session is guaranteed. */
export function useRequiredAuth() {
  const auth = useAuth();
  if (!auth.user) {
    throw new Error("Authenticated session required");
  }
  return { ...auth, user: auth.user };
}

export { portalHome };
export const portalHomes = {
  admin: "/",
  client: "/client/dashboard",
  developer: "/developer/dashboard",
} as const;
