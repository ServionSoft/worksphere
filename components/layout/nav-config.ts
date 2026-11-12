import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Columns3,
  CalendarDays,
  GanttChart,
  BadgeCheck,
  Users,
  Building2,
  Store,
  Wallet,
  Sparkles,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  ready?: boolean;
}

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/", icon: LayoutDashboard, ready: true },
  { title: "My Work", href: "/my-work", icon: CheckSquare, ready: true },
  { title: "Projects", href: "/projects", icon: FolderKanban, ready: true },
  { title: "Tasks & Boards", href: "/boards", icon: Columns3, ready: true },
  { title: "Calendar", href: "/calendar", icon: CalendarDays, ready: true },
  { title: "Timeline & Gantt", href: "/timeline", icon: GanttChart, ready: true },
  { title: "Approvals", href: "/approvals", icon: BadgeCheck, ready: true },
  { title: "Team Members", href: "/team", icon: Users, ready: true },
  { title: "Clients", href: "/clients", icon: Building2, ready: true },
  { title: "Developer Marketplace", href: "/marketplace", icon: Store, ready: true },
  { title: "Finance", href: "/finance", icon: Wallet, ready: true },
  { title: "AI Assistant", href: "/ai", icon: Sparkles, ready: true },
  { title: "Reports & Analytics", href: "/reports", icon: BarChart3, ready: true },
  { title: "Settings", href: "/settings", icon: Settings, ready: true },
];

export function breadcrumbsForPath(
  pathname: string,
  context?: { projectName?: string }
) {
  if (pathname === "/") {
    return [{ label: "Overview", href: "/" }];
  }

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  if (projectMatch) {
    return [
      { label: "Projects", href: "/projects" },
      {
        label: context?.projectName ?? "Project",
        href: pathname,
      },
    ];
  }

  const item = mainNav.find((nav) => nav.href === pathname);
  return [
    { label: "Overview", href: "/" },
    { label: item?.title ?? "Page", href: pathname },
  ];
}
