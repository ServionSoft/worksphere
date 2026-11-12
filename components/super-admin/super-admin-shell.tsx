"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  ArrowLeftRight,
} from "lucide-react";
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
  superAdminBreadcrumbs,
  superAdminNav,
} from "@/components/super-admin/super-admin-nav";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/lib/auth-store";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage(
    "worksphere.super-admin.sidebar",
    false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumbs = superAdminBreadcrumbs(pathname);

  if (!user) return children;

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <div className="hidden lg:block">
        <SuperAdminSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          pathname={pathname}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Super Admin navigation</SheetTitle>
          <SuperAdminSidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
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
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
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
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/" />}
              nativeButton={false}
              className="hidden sm:inline-flex"
            >
              <ArrowLeftRight data-icon="inline-start" />
              Tenant app
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="sm" className="gap-2 px-1.5" />
                }
              >
                <Avatar className="size-7">
                  <AvatarFallback className="text-[10px]">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href="/settings" />}
                >
                  Workspace settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function SuperAdminSidebar({
  collapsed,
  onToggle,
  onNavigate,
  pathname,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  pathname: string;
  className?: string;
}) {
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
        <Link href="/super-admin/dashboard" onClick={onNavigate} className="min-w-0">
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

      {!collapsed ? (
        <div className="px-3 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Platform control
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Super Admin · multi-tenant
          </p>
        </div>
      ) : null}

      <Separator />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {superAdminNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
          <p className="text-[11px] text-muted-foreground">
            WorkSphere Platform · Demo
          </p>
        </div>
      )}
    </aside>
  );
}
