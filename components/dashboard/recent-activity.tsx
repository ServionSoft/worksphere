"use client";

import {
  BadgeCheck,
  MessageSquare,
  RefreshCw,
  Send,
  UserPlus,
  FolderKanban,
} from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { formatRelativeTime } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ActivityType } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconMap: Record<
  ActivityType,
  { icon: typeof BadgeCheck; tone: string }
> = {
  approval: { icon: BadgeCheck, tone: "bg-amber-50 text-amber-700" },
  task_assigned: { icon: UserPlus, tone: "bg-indigo-50 text-indigo-600" },
  submission: { icon: Send, tone: "bg-sky-50 text-sky-700" },
  status_change: { icon: RefreshCw, tone: "bg-red-50 text-red-600" },
  comment: { icon: MessageSquare, tone: "bg-violet-50 text-violet-600" },
  project_update: { icon: FolderKanban, tone: "bg-emerald-50 text-emerald-700" },
};

export function RecentActivity() {
  const { activity } = useWorkspaceStore();
  const recentActivity = activity.slice(0, 6);

  return (
    <SectionCard
      title="Recent activity"
      description="Latest updates across the workspace"
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {recentActivity.map((item) => {
          const meta = iconMap[item.type];
          const Icon = meta.icon;
          return (
            <li key={item.id} className="flex gap-3 px-5 py-3.5">
              <span
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                  meta.tone
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.actorName}
                  {item.projectName ? ` · ${item.projectName}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
