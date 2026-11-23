"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  HelpCircle,
  Menu,
  Plus,
  Search,
  Settings,
  LogOut,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { breadcrumbsForPath } from "@/components/layout/nav-config";
import { formatRelativeTime, initials } from "@/lib/format";
import { useRequiredAuth } from "@/lib/auth-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

interface AppHeaderProps {
  onOpenMobileNav: () => void;
  onQuickCreate: () => void;
}

export function AppHeader({ onOpenMobileNav, onQuickCreate }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useRequiredAuth();
  const {
    searchQuery,
    setSearchQuery,
    projects,
    portalNotifications,
    markNotificationRead,
  } = useWorkspaceStore();
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectName = projectMatch
    ? projects.find((p) => p.id === projectMatch[1])?.name
    : undefined;
  const crumbs = breadcrumbsForPath(pathname, { projectName });
  const notes = portalNotifications.filter(
    (n) => n.portal === "admin" && (!n.userId || n.userId === user.id)
  );
  const unread = notes.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-5">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenMobileNav}
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

      <div className="relative ml-auto w-full max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects, tasks, people..."
          className="h-9 bg-muted/40 pl-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              router.push(
                searchQuery.trim()
                  ? `/projects?q=${encodeURIComponent(searchQuery.trim())}`
                  : "/projects"
              );
            }
          }}
        />
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <Button size="sm" onClick={onQuickCreate} className="hidden sm:inline-flex">
          <Plus data-icon="inline-start" />
          Create
        </Button>
        <Button
          size="icon-sm"
          className="sm:hidden"
          onClick={onQuickCreate}
          aria-label="Quick create"
        >
          <Plus />
        </Button>

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
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                <span className="text-[11px] font-normal text-muted-foreground">
                  {unread} unread
                </span>
              </DropdownMenuLabel>
              {notes.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  No admin notifications
                </DropdownMenuItem>
              ) : (
                notes.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="flex flex-col items-start gap-0.5 py-2"
                    onClick={() => {
                      markNotificationRead(item.id);
                      if (item.href) {
                        router.push(item.href);
                      } else {
                        toast.message(item.title, { description: item.body });
                      }
                    }}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="font-medium">{item.title}</span>
                      {!item.read ? (
                        <span className="size-1.5 rounded-full bg-primary" />
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.body}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const portal = user.portal;
                if (portal === "client") {
                  router.push("/client/notifications");
                } else if (portal === "developer") {
                  router.push("/developer/notifications");
                } else {
                  router.push("/notifications");
                }
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Help"
          render={<a href="mailto:support@worksphere.app" />}
          nativeButton={false}
        >
          <HelpCircle />
        </Button>

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
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <UserRound />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings />
                Account settings
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
  );
}
