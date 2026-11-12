import type { PortalKind, SessionUser } from "@/lib/portal-types";

/** Shared demo password — not production-grade security. */
export const DEMO_PASSWORD = "WorkSphere!2026";

export const DEMO_ACCOUNTS: Array<{
  email: string;
  password: string;
  portal: PortalKind;
  user: SessionUser;
}> = [
  {
    email: "admin@worksphere.demo",
    password: DEMO_PASSWORD,
    portal: "admin",
    user: {
      id: "u1",
      name: "Ayesha Khan",
      email: "admin@worksphere.demo",
      role: "tenant_admin",
      portal: "admin",
      title: "Workspace Admin",
    },
  },
  {
    email: "client@worksphere.demo",
    password: DEMO_PASSWORD,
    portal: "client",
    user: {
      id: "cu1",
      name: "Helen Park",
      email: "client@worksphere.demo",
      role: "client",
      portal: "client",
      clientId: "c1",
      title: "VP Product, Nova Retail",
    },
  },
  {
    email: "developer@worksphere.demo",
    password: DEMO_PASSWORD,
    portal: "developer",
    user: {
      id: "du1",
      name: "Elena Vargas",
      email: "developer@worksphere.demo",
      role: "developer",
      portal: "developer",
      developerId: "dev1",
      title: "Senior Frontend Engineer",
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
