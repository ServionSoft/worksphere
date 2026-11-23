"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, LogOut, Menu, PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WorkSphereLogo } from "@/components/layout/logo";
import {
  portalBreadcrumbs,
  type PortalNavItem,
} from "@/components/portal/portal-nav";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRequiredAuth } from "@/lib/auth-store";
import { initials } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import type { PortalKind } from "@/lib/portal-types";
import { toast } from "sonner";

interface PortalShellProps {
  children: React.ReactNode;
  portal: PortalKind;
  nav: PortalNavItem[];
  brandSubtitle: string;
}

export function PortalShell({
  children,
  portal,
  nav,
  brandSubtitle,
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useRequiredAuth();
  const { portalNotifications, markNotificationRead } = useWorkspaceStore();
  const [collapsed, setCollapsed] = useLocalStorage(
    `worksphere.${portal}.sidebar`,
    false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumbs = portalBreadcrumbs(pathname);
  const notes = portalNotifications.filter(
    (n) => n.portal === portal && n.userId === user.id
  );
  const unread = notes.filter((n) => !n.read).length;

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <div className="hidden lg:block">
        <PortalSidebar
          nav={nav}
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          brandSubtitle={brandSubtitle}
          pathname={pathname}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <PortalSidebar
            nav={nav}
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
            brandSubtitle={brandSubtitle}
            pathname={pathname}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>

          <Breadcrumb className="hidden min-w-0 md:block">
            <BreadcrumbList>
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                return (
                  <div key={crumb.href} className="contents">
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="max-w-40 truncate">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink render={<Link href={crumb.href} />}>
                          {crumb.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </div>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="relative"
                    aria-label="Notifications"
                  />
                }
              >
                <Bell />
                {unread > 0 ? (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  {notes.slice(0, 5).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-0.5 py-2"
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.href) router.push(n.href);
                        else toast.message(n.title, { description: n.body });
                      }}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="font-medium">{n.title}</span>
                        {!n.read ? (
                          <span className="size-1.5 rounded-full bg-primary" />
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {n.body}
                      </span>
                      {n.category ? (
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {n.category}
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                  {notes.length === 0 ? (
                    <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      portal === "client"
                        ? "/client/notifications"
                        : "/developer/notifications"
                    )
                  }
                >
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="rounded-full" />
                }
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push(`/${portal}/settings`)}
                  >
                    Account
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function PortalSidebar({
  nav,
  collapsed,
  onToggle,
  onNavigate,
  brandSubtitle,
  pathname,
  className,
}: {
  nav: PortalNavItem[];
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  brandSubtitle: string;
  pathname: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
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
        <Link href={nav[0]?.href ?? "/"} onClick={onNavigate} className="min-w-0">
          <WorkSphereLogo collapsed={collapsed} />
        </Link>
        {!collapsed ? (
          <Button variant="ghost" size="icon-sm" onClick={onToggle}>
            <PanelLeftClose />
          </Button>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="px-3 py-3">
          <p className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-muted-foreground">
            {brandSubtitle}
          </p>
        </div>
      ) : null}

      <Separator />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground"
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
          <Button variant="ghost" size="icon" className="w-full" onClick={onToggle}>
            <PanelLeft />
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
