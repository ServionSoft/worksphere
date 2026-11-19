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
  bootstrapProfile,
  fetchMe,
  onboard,
  sessionUserFromMe,
  type AuthMeResponse,
} from "@/lib/api/auth";
import { isApiDataSource } from "@/lib/data-source";
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
import {
  clearDeveloperRegistrationDraft,
  readDeveloperRegistrationDraft,
} from "@/lib/developer-registration";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
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
  me: AuthMeResponse | null;
  login: (
    email: string,
    password: string,
    portal: PortalKind,
    remember: boolean
  ) => Promise<LoginResult>;
  logout: () => void;
  can: (action: PermissionAction) => boolean;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; message: string }>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthStoreValue | null>(null);

function useApiAuth(): boolean {
  return isApiDataSource() && isSupabaseConfigured();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const apiAuth = useApiAuth();

  const applySessionUser = useCallback(
    (user: SessionUser, remember: boolean) => {
      const next = createSession(user, remember);
      writeSessionToStorage(next);
      setSession(next);
      return next;
    },
    []
  );

  const refreshMe = useCallback(async () => {
    if (!apiAuth) return;
    try {
      const data = await fetchMe();
      setMe(data);
      if (session?.user) {
        const mapped = sessionUserFromMe(data, session.portal);
        if (mapped) {
          applySessionUser(mapped, session.remember);
        }
      }
    } catch {
      /* session may be stale; login flow handles errors */
    }
  }, [apiAuth, session, applySessionUser]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!apiAuth) {
        if (!cancelled) {
          setSession(readSessionFromStorage());
          setHydrated(true);
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) setHydrated(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        clearSessionStorage();
        if (!cancelled) {
          setSession(null);
          setMe(null);
          setHydrated(true);
        }
        return;
      }

      try {
        const meData = await fetchMe();
        if (cancelled) return;
        setMe(meData);
        const stored = readSessionFromStorage();
        const portal = stored?.portal ?? "admin";
        const user = sessionUserFromMe(meData, portal);
        if (user) {
          applySessionUser(user, stored?.remember ?? true);
        } else {
          clearSessionStorage();
          setSession(null);
        }
      } catch {
        if (!cancelled) {
          clearSessionStorage();
          setSession(null);
          setMe(null);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [apiAuth, applySessionUser]);

  useEffect(() => {
    if (!session || apiAuth) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      clearSessionStorage();
      const t = window.setTimeout(() => setSession(null), 0);
      return () => window.clearTimeout(t);
    }
    const timer = window.setTimeout(() => {
      clearSessionStorage();
      setSession(null);
      router.replace("/login?reason=expired");
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [session, router, apiAuth]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      portal: PortalKind,
      remember: boolean
    ): Promise<LoginResult> => {
      if (!email.trim() || !password) {
        return { ok: false, error: "Email and password are required." };
      }
      if (!isValidEmail(email)) {
        return { ok: false, error: "Enter a valid email address." };
      }

      if (!apiAuth) {
        await new Promise((r) => setTimeout(r, 450));
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
        applySessionUser(account.user, remember);
        return { ok: true, user: account.user };
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return {
          ok: false,
          error:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        };
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        const msg = error.message || "Invalid email or password.";
        if (/confirm|verified|verification/i.test(msg)) {
          return {
            ok: false,
            error:
              "Email not verified yet. Open the link we sent, or resend it from the registration page.",
          };
        }
        return { ok: false, error: msg };
      }

      try {
        let meData: AuthMeResponse;
        try {
          meData = await fetchMe();
        } catch {
          // Profile may not exist yet right after first verified login.
          await bootstrapProfile({
            fullName:
              readDeveloperRegistrationDraft()?.fullName ||
              (typeof signInData.user?.user_metadata?.full_name === "string"
                ? signInData.user.user_metadata.full_name
                : undefined),
          });
          meData = await fetchMe();
        }

        if (portal === "developer" && !meData.profile.developerProfileId) {
          const draft = readDeveloperRegistrationDraft();
          const meta = signInData.user?.user_metadata as
            | Record<string, unknown>
            | undefined;
          await onboard({
            kind: "developer",
            developer: {
              title:
                draft?.title ||
                (typeof meta?.title === "string" ? meta.title : undefined),
              phone:
                draft?.phone ||
                (typeof meta?.phone === "string" ? meta.phone : undefined),
              skills: draft?.skills,
              bio: draft?.bio,
              experienceYears: draft?.experienceYears,
              portfolioUrl: draft?.portfolioUrl || "",
              githubUrl: draft?.githubUrl || "",
            },
          });
          clearDeveloperRegistrationDraft();
          meData = await fetchMe();
        }
        setMe(meData);
        const user = sessionUserFromMe(meData, portal);
        if (!user) {
          await supabase.auth.signOut();
          return {
            ok: false,
            error: `This account does not have ${portal} portal access.`,
          };
        }
        applySessionUser(user, remember);
        return { ok: true, user };
      } catch (e) {
        await supabase.auth.signOut();
        const message =
          e instanceof Error ? e.message : "Failed to load application profile.";
        return { ok: false, error: message };
      }
    },
    [apiAuth, applySessionUser]
  );

  const logout = useCallback(() => {
    clearSessionStorage();
    setSession(null);
    setMe(null);
    if (apiAuth) {
      void getSupabaseBrowserClient()?.auth.signOut();
    }
    router.replace("/login");
  }, [router, apiAuth]);

  const can = useCallback(
    (action: PermissionAction) => {
      if (!session?.user) return false;
      return rolePermissions[session.user.role].includes(action);
    },
    [session]
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!email.trim()) {
        return { ok: false, message: "Email is required." };
      }
      if (!isValidEmail(email)) {
        return { ok: false, message: "Enter a valid email address." };
      }

      if (!apiAuth) {
        await new Promise((r) => setTimeout(r, 400));
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
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return { ok: false, message: "Supabase is not configured." };
      }
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              "/login/reset-password"
            )}`
          : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) return { ok: false, message: error.message };
      return {
        ok: true,
        message: "If this email is registered, a reset link has been sent.",
      };
    },
    [apiAuth]
  );

  const value = useMemo<AuthStoreValue>(
    () => ({
      user: session?.user ?? null,
      session,
      hydrated,
      isAuthenticated: isSessionValid(session),
      me,
      login,
      logout,
      can,
      requestPasswordReset,
      refreshMe,
    }),
    [
      session,
      hydrated,
      me,
      login,
      logout,
      can,
      requestPasswordReset,
      refreshMe,
    ]
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
  super_admin: "/super-admin/dashboard",
} as const;
