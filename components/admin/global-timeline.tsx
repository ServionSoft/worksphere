"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { PriorityBadge } from "@/components/shared/priority-badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { daysBetween, formatShortDate } from "@/lib/format";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-indigo-500",
  review: "bg-violet-500",
  done: "bg-emerald-500",
  blocked: "bg-red-400",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

export function GlobalTimeline() {
  const { tasks, projects } = useWorkspaceStore();
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");

  const rows = useMemo(() => {
    return tasks
      .filter((t) => !t.parentId)
      .filter((t) =>
        projectFilter === "all" ? true : t.projectId === projectFilter
      )
      .filter((t) =>
        statusFilter === "all" ? true : t.status === statusFilter
      )
      .sort((a, b) => {
        const byStart = a.startDate.localeCompare(b.startDate);
        if (byStart !== 0) return byStart;
        return a.projectName.localeCompare(b.projectName);
      });
  }, [tasks, projectFilter, statusFilter]);

  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (rows.length === 0) {
      return {
        rangeStart: "2026-03-01",
        rangeEnd: "2026-06-30",
        totalDays: daysBetween("2026-03-01", "2026-06-30"),
      };
    }
    let start = rows[0].startDate;
    let end = rows[0].dueDate;
    for (const t of rows) {
      if (t.startDate < start) start = t.startDate;
      if (t.dueDate > end) end = t.dueDate;
    }
    for (const p of projects) {
      if (projectFilter !== "all" && p.id !== projectFilter) continue;
      if (p.startDate < start) start = p.startDate;
      if (p.dueDate > end) end = p.dueDate;
    }
    return {
      rangeStart: start,
      rangeEnd: end,
      totalDays: daysBetween(start, end),
    };
  }, [rows, projects, projectFilter]);

  const months = useMemo(
    () => buildMonthMarkers(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
  );

  function barStyle(task: Task) {
    const offset = daysBetween(rangeStart, task.startDate) - 1;
    const duration = daysBetween(task.startDate, task.dueDate);
    const left = Math.max(0, (offset / totalDays) * 100);
    const width = Math.max(4, (duration / totalDays) * 100);
    return {
      left: `${Math.min(left, 96)}%`,
      width: `${Math.min(width, 100 - left)}%`,
    };
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Timeline & Gantt"
        description="Cross-project schedule bars for parent tasks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={projectFilter}
              onValueChange={(v) => v && setProjectFilter(v)}
            >
              <SelectTrigger className="min-w-40">
                <SelectValue>
                  {projectFilter === "all"
                    ? "All projects"
                    : projects.find((p) => p.id === projectFilter)?.name ??
                      "Project"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects
                    .filter((p) => !p.archived)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) =>
                v && setStatusFilter(v as "all" | TaskStatus)
              }
            >
              <SelectTrigger className="min-w-36">
                <SelectValue>
                  {statusFilter === "all"
                    ? "All statuses"
                    : statusLabels[statusFilter]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(statusLabels) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <SectionCard
        title="Workspace timeline"
        description={`${rows.length} task${rows.length === 1 ? "" : "s"} · ${formatShortDate(rangeStart)} – ${formatShortDate(rangeEnd)}`}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[260px_1fr] border-b border-border bg-muted/30">
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
                Task
              </div>
              <div className="relative px-2 py-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {months.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {rows.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[260px_1fr] border-b border-border last:border-b-0"
              >
                <div className="px-4 py-3">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {task.projectName}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatShortDate(task.startDate)} –{" "}
                      {formatShortDate(task.dueDate)}
                    </span>
                  </div>
                </div>
                <div className="relative px-2 py-3">
                  <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-border/80" />
                  <div
                    className={cn(
                      "absolute top-1/2 h-6 -translate-y-1/2 rounded-md px-2 text-[10px] font-medium text-white shadow-sm",
                      statusColors[task.status]
                    )}
                    style={barStyle(task)}
                    title={`${task.title} (${statusLabels[task.status]})`}
                  >
                    <span className="block truncate leading-6">
                      {task.assigneeName.split(" ")[0]}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No tasks match the current filters.
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function buildMonthMarkers(start: string, end: string): string[] {
  const markers: string[] = [];
  const cursor = new Date(start);
  cursor.setDate(1);
  const endDate = new Date(end);
  while (cursor <= endDate && markers.length < 8) {
    markers.push(
      cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return markers;
}
