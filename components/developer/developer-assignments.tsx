"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  developerDirectTasks,
  developerAssignments,
} from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { AssignmentStatus } from "@/lib/portal-types";

const tabs: Array<"all" | AssignmentStatus | "direct"> = [
  "all",
  "direct",
  "pending_confirmation",
  "not_started",
  "in_progress",
  "submitted",
  "revision_requested",
  "approved",
  "completed",
];

export function DeveloperAssignmentsPage() {
  const { user } = useRequiredAuth();
  const { assignments, tasks, projects } = useWorkspaceStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const mine = developerAssignments(assignments, user);
  const directTasks = developerDirectTasks(tasks, user);

  const filteredMarketplace = useMemo(
    () => (tab === "all" || tab === "direct" ? mine : mine.filter((a) => a.status === tab)),
    [mine, tab]
  );

  const showDirect = tab === "all" || tab === "direct";
  const showMarketplace = tab !== "direct";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Assignments"
        description="Direct project tasks and marketplace assignments. Other developers' work stays hidden."
      />
      <Tabs
        value={tab}
        onValueChange={(v) => typeof v === "string" && setTab(v as typeof tab)}
      >
        <TabsList className="h-auto flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t === "direct" ? "Direct tasks" : t.replaceAll("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-3">
        {showDirect
          ? directTasks.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              return (
                <div
                  key={`task-${task.id}`}
                  className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/developer/projects/${task.projectId}?tab=my-tasks`}
                          className="text-sm font-semibold hover:text-primary"
                        >
                          {task.title}
                        </Link>
                        <Badge variant="outline">Direct task</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {project?.name ?? task.projectName} · Due{" "}
                        {formatShortDate(task.dueDate)}
                      </p>
                      <Link
                        href={`/developer/projects/${task.projectId}`}
                        className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline"
                      >
                        View project · timeline & milestones
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                </div>
              );
            })
          : null}

        {showMarketplace
          ? filteredMarketplace.map((a) => {
              const pending = a.status === "pending_confirmation";
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm ${
                    pending
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/developer/tasks/${a.id}`}
                          className="text-sm font-semibold hover:text-primary"
                        >
                          {a.title}
                        </Link>
                        <Badge variant="secondary">Marketplace</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.projectName ?? "Independent"} ·{" "}
                        {formatCurrency(a.budget, a.currency)} · Due{" "}
                        {formatShortDate(a.deadline)}
                      </p>
                      {pending ? (
                        <p className="mt-1 text-xs text-amber-800">
                          Waiting for admin confirmation — submit stays locked.
                        </p>
                      ) : null}
                      {a.projectId ? (
                        <Link
                          href={`/developer/projects/${a.projectId}`}
                          className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline"
                        >
                          View project · timeline & milestones
                        </Link>
                      ) : null}
                    </div>
                    {pending ? (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-100 text-amber-900 capitalize"
                      >
                        Pending confirmation
                      </Badge>
                    ) : (
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {a.status.replaceAll("_", " ")}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/developer/tasks/${a.id}`}
                    className="mt-3 flex items-center gap-3"
                  >
                    <Progress value={a.progress} className="flex-1" />
                    <span className="text-xs tabular-nums">{a.progress}%</span>
                  </Link>
                </div>
              );
            })
          : null}

        {(showDirect ? directTasks.length : 0) +
          (showMarketplace ? filteredMarketplace.length : 0) ===
        0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
            No assignments in this tab.
          </div>
        ) : null}
      </div>
    </div>
  );
}
