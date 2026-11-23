import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Settings,
  Store,
} from "lucide-react";

export interface SuperAdminNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const superAdminNav: SuperAdminNavItem[] = [
  {
    title: "Overview",
    href: "/super-admin/dashboard",
    icon: LayoutDashboard,
  },
  { title: "Tenants", href: "/super-admin/tenants", icon: Building2 },
  {
    title: "Subscriptions",
    href: "/super-admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Marketplace",
    href: "/super-admin/marketplace",
    icon: Store,
  },
  { title: "Revenue", href: "/super-admin/revenue", icon: LineChart },
  {
    title: "Notifications",
    href: "/super-admin/notifications",
    icon: Bell,
  },
  {
    title: "Activity & Security",
    href: "/super-admin/activity",
    icon: Activity,
  },
  {
    title: "Platform settings",
    href: "/super-admin/settings",
    icon: Settings,
  },
];

export function superAdminBreadcrumbs(pathname: string) {
  if (pathname === "/super-admin/dashboard" || pathname === "/super-admin") {
    return [{ label: "Overview", href: "/super-admin/dashboard" }];
  }
  const item = superAdminNav.find((n) => n.href === pathname);
  return [
    { label: "Overview", href: "/super-admin/dashboard" },
    { label: item?.title ?? "Page", href: pathname },
  ];
}
