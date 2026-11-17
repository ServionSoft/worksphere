import type { PortalKind, SessionUser } from "@/lib/portal-types";

/**
 * Fresh-reset test accounts (API mode).
 * Passwords match backend/.local-reset-credentials.txt after reset.
 */
export const DEMO_PASSWORD = "Ws!shared-unused";

export const DEMO_ACCOUNTS: Array<{
  email: string;
  password: string;
  portal: PortalKind;
  user: SessionUser;
}> = [
  {
    email: "jawad@worksphere.demo",
    password: "Ws!5jy24YvDcFNBbFSQ7cSwRxiD",
    portal: "admin",
    user: {
      id: "admin-jawad",
      name: "Jawad",
      email: "jawad@worksphere.demo",
      role: "tenant_admin",
      portal: "admin",
      title: "Tenant Admin",
    },
  },
  {
    email: "taha@worksphere.demo",
    password: "Ws!ubDZGL-KtYEdxgSvSjegPNjj",
    portal: "developer",
    user: {
      id: "dev-taha",
      name: "Taha",
      email: "taha@worksphere.demo",
      role: "developer",
      portal: "developer",
      developerId: "dev-taha",
      title: "Developer",
    },
  },
  {
    email: "charles@worksphere.demo",
    password: "Ws!8XRLzoU64ucBTWZ14it4FSs9",
    portal: "client",
    user: {
      id: "client-charles",
      name: "Charles",
      email: "charles@worksphere.demo",
      role: "client",
      portal: "client",
      clientId: "client-charles",
      title: "Client",
    },
  },
];

export const SESSION_COOKIE = "worksphere.session";
export const SESSION_STORAGE_KEY = "worksphere.auth.session";

/** Demo session lifetime */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
export const SESSION_TTL_REMEMBER_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function findDemoAccount(email: string) {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.email === normalized) ?? null;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
