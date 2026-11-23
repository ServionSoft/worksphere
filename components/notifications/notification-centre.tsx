"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  dismissApiNotification,
  listApiNotifications,
  markApiAllNotificationsRead,
  markApiNotificationRead,
  markApiNotificationUnread,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { formatRelativeTime } from "@/lib/format";
import { useRequiredAuth } from "@/lib/auth-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { PortalKind } from "@/lib/portal-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "milestones", label: "Milestones" },
  { id: "submissions", label: "Approvals" },
  { id: "marketplace", label: "Marketplace" },
  { id: "messages", label: "Messages" },
  { id: "finance", label: "Finance" },
  { id: "account", label: "Account" },
  { id: "security", label: "Security" },
] as const;

type StatusFilter = "all" | "unread" | "read";

export function NotificationCentre({
  portal,
  settingsHref,
}: {
  portal: PortalKind;
  settingsHref?: string;
}) {
  const router = useRouter();
  const { user } = useRequiredAuth();
  const {
    workspace,
    portalNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    mergeNotifications,
    refreshNotifications,
  } = useWorkspaceStore();

  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const localNotes = useMemo(
    () =>
      portalNotifications.filter(
        (n) =>
          n.portal === portal &&
          (!n.userId || n.userId === user.id) &&
          (n.workspaceId || workspace.id) === workspace.id
      ),
    [portalNotifications, portal, user.id, workspace.id]
  );

  const refresh = useCallback(async () => {
    if (!isApiDataSource() || !workspace.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listApiNotifications(workspace.id, {
        status,
        category: category === "all" ? undefined : category,
        q: q.trim() || undefined,
        limit: 50,
      });
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
      mergeNotifications(data.items);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Failed to load notifications"
      );
    } finally {
      setLoading(false);
    }
  }, [workspace.id, status, category, q, mergeNotifications]);

  useEffect(() => {
    void refresh();
    if (!isApiDataSource()) return;
    const id = window.setInterval(() => {
      void refreshNotifications();
      void refresh();
    }, 25_000);
    return () => window.clearInterval(id);
  }, [refresh, refreshNotifications]);

  const visible = useMemo(() => {
    let list = localNotes;
    if (status === "unread") list = list.filter((n) => !n.read);
    if (status === "read") list = list.filter((n) => n.read);
    if (category !== "all") {
      list = list.filter((n) => (n.category || "account") === category);
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(needle) ||
          n.body.toLowerCase().includes(needle)
      );
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [localNotes, status, category, q]);

  function onOpen(id: string, href?: string) {
    markNotificationRead(id);
    if (href) router.push(href);
  }

  async function onToggleRead(id: string, read: boolean) {
    if (!isApiDataSource()) {
      if (!read) markNotificationRead(id);
      return;
    }
    try {
      if (read) await markApiNotificationUnread(workspace.id, id);
      else await markApiNotificationRead(workspace.id, id);
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update notification"
      );
    }
  }

  async function onDismiss(id: string) {
    if (!isApiDataSource()) return;
    try {
      await dismissApiNotification(workspace.id, id);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dismiss failed");
    }
  }

  async function onMarkAll() {
    markAllNotificationsRead(portal, user.id);
    if (isApiDataSource()) {
      try {
        await markApiAllNotificationsRead(workspace.id);
        await refresh();
      } catch {
        /* optimistic */
      }
    }
  }

  const unreadLocal = localNotes.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notifications"
        description="Stay on top of projects, approvals, messages and marketplace activity."
        actions={
          <div className="flex flex-wrap gap-2">
            {settingsHref ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(settingsHref)}
              >
                Preferences
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => void onMarkAll()}>
              <CheckCheck data-icon="inline-start" />
              Mark all read
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "unread", "read"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s === "all"
              ? "All"
              : s === "unread"
                ? `Unread (${unreadCount || unreadLocal})`
                : "Read"}
          </Button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notifications"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              category === c.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <SectionCard
        title="Inbox"
        description={
          loading
            ? "Refreshing…"
            : `${visible.length} shown${total ? ` · ${total} total` : ""}`
        }
        bodyClassName="p-0"
      >
        {error ? (
          <div className="px-5 py-8 text-center text-sm text-destructive">
            {error}
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        {loading && visible.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading notifications…
          </div>
        ) : null}

        {!loading && !error && visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <Bell className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Activity from projects, approvals, marketplace and messages will
              appear here. Nothing is fabricated to fill this inbox.
            </p>
          </div>
        ) : null}

        <ul className="divide-y divide-border">
          {visible.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between",
                !n.read && "bg-primary/[0.03]"
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpen(n.id, n.href)}
              >
                <div className="flex items-center gap-2">
                  {!n.read ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  ) : null}
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {n.category || "account"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatRelativeTime(n.createdAt)}
                  {n.href ? " · Open related item" : ""}
                </p>
              </button>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onToggleRead(n.id, n.read)}
                >
                  {n.read ? "Mark unread" : "Mark read"}
                </Button>
                {isApiDataSource() ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Dismiss"
                    onClick={() => void onDismiss(n.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
