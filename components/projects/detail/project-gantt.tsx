"use client";

import { useMemo } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatShortDate, daysBetween } from "@/lib/format";
import type { Project, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectGanttProps {
  project: Project;
  tasks: Task[];
}

const statusColors: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-indigo-500",
  review: "bg-violet-500",
  done: "bg-emerald-500",
  blocked: "bg-red-400",
};

export function ProjectGantt({ project, tasks }: ProjectGanttProps) {
  const parents = useMemo(
    () =>
      tasks
        .filter((t) => !t.parentId)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [tasks]
  );

  const rangeStart = project.startDate;
  const rangeEnd = project.dueDate;
  const totalDays = daysBetween(rangeStart, rangeEnd);

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

  const months = buildMonthMarkers(rangeStart, rangeEnd);

  return (
    <SectionCard
      title="Timeline & Gantt"
      description="Task schedule across the project window"
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[220px_1fr] border-b border-border bg-muted/30">
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

          {parents.map((task) => (
            <div
              key={task.id}
              className="grid grid-cols-[220px_1fr] border-b border-border last:border-b-0"
            >
              <div className="px-4 py-3">
                <p className="truncate text-sm font-medium">{task.title}</p>
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
                  title={`${task.title} (${task.status})`}
                >
                  <span className="block truncate leading-6">
                    {task.assigneeName.split(" ")[0]}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {parents.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No tasks to plot on the timeline.
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function buildMonthMarkers(start: string, end: string): string[] {
  const markers: string[] = [];
  const cursor = new Date(start);
  cursor.setDate(1);
  const endDate = new Date(end);
  while (cursor <= endDate && markers.length < 6) {
    markers.push(
      cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return markers;
}
