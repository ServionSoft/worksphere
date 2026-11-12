export interface PlatformTenant {
  id: string;
  name: string;
  plan: "Starter" | "Pro" | "Enterprise";
  status: "active" | "suspended" | "trial";
  seats: number;
  usedSeats: number;
  mrr: number;
  createdAt: string;
  ownerEmail: string;
  projects: number;
  developers: number;
}

export interface PlatformSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  status: "active" | "past_due" | "canceled";
  renewsAt: string;
  amount: number;
}

export interface PlatformActivity {
  id: string;
  title: string;
  detail: string;
  at: string;
  severity: "info" | "warning" | "critical";
}

export const platformTenants: PlatformTenant[] = [
  {
    id: "ws1",
    name: "Apex Digital",
    plan: "Enterprise",
    status: "active",
    seats: 50,
    usedSeats: 28,
    mrr: 2490,
    createdAt: "2025-06-12",
    ownerEmail: "admin@worksphere.demo",
    projects: 8,
    developers: 14,
  },
  {
    id: "ws2",
    name: "Northwind Labs",
    plan: "Pro",
    status: "active",
    seats: 20,
    usedSeats: 11,
    mrr: 790,
    createdAt: "2025-09-03",
    ownerEmail: "ops@northwind.demo",
    projects: 4,
    developers: 6,
  },
  {
    id: "ws3",
    name: "Harbor Studio",
    plan: "Pro",
    status: "trial",
    seats: 10,
    usedSeats: 4,
    mrr: 0,
    createdAt: "2026-02-20",
    ownerEmail: "hello@harbor.demo",
    projects: 2,
    developers: 3,
  },
  {
    id: "ws4",
    name: "Pixel Forge",
    plan: "Starter",
    status: "suspended",
    seats: 5,
    usedSeats: 5,
    mrr: 0,
    createdAt: "2025-11-01",
    ownerEmail: "billing@pixelforge.demo",
    projects: 1,
    developers: 2,
  },
];

export const platformSubscriptions: PlatformSubscription[] = [
  {
    id: "sub1",
    tenantId: "ws1",
    tenantName: "Apex Digital",
    plan: "Enterprise",
    status: "active",
    renewsAt: "2026-04-12",
    amount: 2490,
  },
  {
    id: "sub2",
    tenantId: "ws2",
    tenantName: "Northwind Labs",
    plan: "Pro",
    status: "active",
    renewsAt: "2026-04-03",
    amount: 790,
  },
  {
    id: "sub3",
    tenantId: "ws3",
    tenantName: "Harbor Studio",
    plan: "Pro trial",
    status: "active",
    renewsAt: "2026-03-20",
    amount: 0,
  },
];

export const platformActivity: PlatformActivity[] = [
  {
    id: "pa1",
    title: "Tenant suspended",
    detail: "Pixel Forge suspended for unpaid invoice",
    at: "2026-03-10T16:00:00Z",
    severity: "critical",
  },
  {
    id: "pa2",
    title: "New developer registration",
    detail: "Mei Lin pending verification on Apex Digital",
    at: "2026-03-11T08:20:00Z",
    severity: "info",
  },
  {
    id: "pa3",
    title: "Usage spike",
    detail: "Apex Digital marketplace listings +40% WoW",
    at: "2026-03-11T07:00:00Z",
    severity: "warning",
  },
];

export interface PlatformPlanFeature {
  id: string;
  label: string;
  enabled: boolean;
}

export interface PlatformPlan {
  id: string;
  name: string;
  price: number;
  seats: number;
  features: PlatformPlanFeature[];
}

export const platformPlans: PlatformPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 99,
    seats: 5,
    features: [
      { id: "projects_3", label: "3 projects", enabled: true },
      { id: "marketplace_browse", label: "Marketplace browse", enabled: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 790,
    seats: 20,
    features: [
      { id: "unlimited_projects", label: "Unlimited projects", enabled: true },
      { id: "ai_assistant", label: "AI Assistant", enabled: true },
      { id: "reports", label: "Reports", enabled: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 2490,
    seats: 50,
    features: [
      { id: "sso", label: "SSO", enabled: true },
      { id: "custom_roles", label: "Custom roles", enabled: true },
      { id: "dedicated_support", label: "Dedicated support", enabled: true },
      { id: "ai_suite", label: "AI suite", enabled: true },
    ],
  },
];
