"use client";

import {
  FolderKanban,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  BadgeCheck,
  Users,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

const items = [
  {
    key: "totalProjects",
    label: "Total Projects",
    icon: FolderKanban,
    tone: "text-indigo-600 bg-indigo-50",
  },
  {
    key: "activeProjects",
    label: "Active Projects",
    icon: PlayCircle,
    tone: "text-sky-600 bg-sky-50",
  },
  {
    key: "completedProjects",
    label: "Completed",
    icon: CheckCircle2,
    tone: "text-emerald-600 bg-emerald-50",
  },
  {
    key: "overdueTasks",
    label: "Overdue Tasks",
    icon: AlertTriangle,
    tone: "text-red-600 bg-red-50",
  },
  {
    key: "pendingApprovals",
    label: "Pending Approvals",
    icon: BadgeCheck,
    tone: "text-amber-600 bg-amber-50",
  },
  {
    key: "teamMembers",
    label: "Team Members",
    icon: Users,
    tone: "text-violet-600 bg-violet-50",
  },
] as const;

export function KpiOverview() {
  const { kpis } = useWorkspaceStore();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-lg",
                  item.tone
                )}
              >
                <Icon className="size-3.5" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {kpis[item.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
