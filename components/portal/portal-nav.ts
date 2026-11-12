import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  BadgeCheck,
  FileText,
  MessageSquare,
  Receipt,
  Bell,
  Settings,
  Store,
  Briefcase,
  Upload,
  Wallet,
  UserRound,
} from "lucide-react";

export interface PortalNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const clientNav: PortalNavItem[] = [
  { title: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { title: "My Projects", href: "/client/projects", icon: FolderKanban },
  { title: "Approvals", href: "/client/approvals", icon: BadgeCheck },
  { title: "Documents", href: "/client/documents", icon: FileText },
  { title: "Messages", href: "/client/messages", icon: MessageSquare },
  { title: "Billing", href: "/client/billing", icon: Receipt },
  { title: "Notifications", href: "/client/notifications", icon: Bell },
  { title: "Settings", href: "/client/settings", icon: Settings },
];

export const developerNav: PortalNavItem[] = [
  { title: "Dashboard", href: "/developer/dashboard", icon: LayoutDashboard },
  { title: "Marketplace", href: "/developer/marketplace", icon: Store },
  { title: "My Assignments", href: "/developer/my-tasks", icon: Briefcase },
  { title: "Submissions", href: "/developer/submissions", icon: Upload },
  { title: "Earnings", href: "/developer/earnings", icon: Wallet },
  { title: "Messages", href: "/developer/messages", icon: MessageSquare },
  { title: "Notifications", href: "/developer/notifications", icon: Bell },
  { title: "My Profile", href: "/developer/profile", icon: UserRound },
  { title: "Settings", href: "/developer/settings", icon: Settings },
];

export function portalBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Home", href: "/" }];
  const crumbs: Array<{ label: string; href: string }> = [];
  let href = "";
  for (const part of parts) {
    href += `/${part}`;
    const label = part
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, href });
  }
  return crumbs;
}
