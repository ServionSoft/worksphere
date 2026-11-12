"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { WorkSphereLogo } from "@/components/layout/logo";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { mainNav } from "@/components/layout/nav-config";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
  onNavigate?: () => void;
}

export function AppSidebar({
  collapsed,
  onToggle,
  className,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        <Link href="/" onClick={onNavigate} className="min-w-0">
          <WorkSphereLogo collapsed={collapsed} />
        </Link>
        {!collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose />
          </Button>
        ) : null}
      </div>

      <div className={cn("px-3 py-3", collapsed && "px-2")}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {mainNav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-2",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed ? <span className="truncate">{item.title}</span> : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {collapsed ? (
        <div className="border-t border-sidebar-border p-2">
          {isSuperAdmin ? (
            <Button
              variant="ghost"
              size="icon"
              className="mb-1 w-full"
              render={<Link href="/super-admin/dashboard" />}
              nativeButton={false}
              onClick={onNavigate}
              aria-label="Super Admin"
              title="Super Admin"
            >
              <Shield />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={onToggle}
            aria-label="Expand sidebar"
          >
            <PanelLeft />
          </Button>
        </div>
      ) : (
        <div className="border-t border-sidebar-border px-3 py-3">
          {isSuperAdmin ? (
            <Button
              size="sm"
              variant="outline"
              className="mb-2 w-full justify-start"
              render={<Link href="/super-admin/dashboard" />}
              nativeButton={false}
              onClick={onNavigate}
            >
              <Shield data-icon="inline-start" />
              Super Admin
            </Button>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            Apex Digital · Enterprise
          </p>
        </div>
      )}
    </aside>
  );
}
