import type { AppRole, PortalKind, SessionUser } from "@/lib/portal-types";
import {
  SESSION_COOKIE,
  SESSION_STORAGE_KEY,
  SESSION_TTL_MS,
  SESSION_TTL_REMEMBER_MS,
} from "@/lib/demo-credentials";

export interface AuthSession {
  user: SessionUser;
  portal: PortalKind;
  remember: boolean;
  expiresAt: number;
  issuedAt: number;
}

export function createSession(
  user: SessionUser,
  remember: boolean
): AuthSession {
  const now = Date.now();
  return {
    user,
    portal: user.portal,
    remember,
    issuedAt: now,
    expiresAt: now + (remember ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_MS),
  };
}

export function isSessionValid(session: AuthSession | null | undefined) {
  if (!session?.user?.id) return false;
  return session.expiresAt > Date.now();
}

export function readSessionFromStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_STORAGE_KEY) ??
      window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!isSessionValid(parsed)) {
      clearSessionStorage();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSessionToStorage(session: AuthSession) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  clearSessionStorage();
  if (session.remember) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, raw);
  } else {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, raw);
  }
  writeSessionCookie(session);
}

export function clearSessionStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  clearSessionCookie();
}

function writeSessionCookie(session: AuthSession) {
  const maxAge = Math.max(
    0,
    Math.floor((session.expiresAt - Date.now()) / 1000)
  );
  const payload = encodeURIComponent(
    JSON.stringify({
      portal: session.portal,
      role: session.user.role,
      exp: session.expiresAt,
    })
  );
  document.cookie = `${SESSION_COOKIE}=${payload}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function portalHome(portal: PortalKind, role?: AppRole) {
  if (role === "super_admin") return "/super-admin/dashboard";
  if (portal === "client") return "/client/dashboard";
  if (portal === "developer") return "/developer/dashboard";
  return "/";
}

export function portalForPath(pathname: string): PortalKind | "public" {
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/access-denied")
  ) {
    return "public";
  }
  if (pathname.startsWith("/client")) return "client";
  if (pathname.startsWith("/developer")) return "developer";
  // /super-admin and tenant admin app share the admin portal cookie
  return "admin";
}

export function roleMatchesPortal(role: AppRole, portal: PortalKind) {
  if (portal === "admin") {
    return (
      role === "super_admin" ||
      role === "tenant_admin" ||
      role === "project_manager" ||
      role === "internal_member"
    );
  }
  if (portal === "client") return role === "client";
  return role === "developer";
}
