"use client";

import { useMemo } from "react";
import { Flag, Milestone, ClipboardCheck } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { formatShortDate } from "@/lib/format";
import { DEMO_NOW } from "@/lib/demo-clock";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

const typeMeta = {
  milestone: {
    label: "Milestone",
    icon: Milestone,
    tone: "bg-indigo-50 text-indigo-600",
  },
  deadline: {
    label: "Deadline",
    icon: Flag,
    tone: "bg-amber-50 text-amber-700",
  },
  review: {
    label: "Review",
    icon: ClipboardCheck,
    tone: "bg-sky-50 text-sky-700",
  },
} as const;

export function UpcomingDeadlines() {
  const { milestones, tasks, projects, workSubmissions } = useWorkspaceStore();

  const items = useMemo(() => {
    const projectName = (id: string) =>
      projects.find((p) => p.id === id)?.name ?? "Project";

    const milestoneItems = milestones
      .filter((m) => m.status !== "completed")
      .map((m) => ({
        id: m.id,
        title: m.title,
        projectName: projectName(m.projectId),
        date: m.dueDate,
        type: "milestone" as const,
      }));

    const taskItems = tasks
      .filter((t) => !t.parentId && t.status !== "done")
      .map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.projectName,
        date: t.dueDate,
        type: "deadline" as const,
      }));

    const reviewItems = workSubmissions
      .filter((w) => w.status === "submitted" || w.status === "in_review")
      .map((w) => ({
        id: w.id,
        title: w.title,
        projectName: w.projectId ? projectName(w.projectId) : "Assignment",
        date: w.submittedAt.slice(0, 10),
        type: "review" as const,
      }));

    return [...milestoneItems, ...taskItems, ...reviewItems]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [milestones, tasks, projects, workSubmissions]);

  return (
    <SectionCard
      title="Upcoming deadlines"
      description="Milestones, tasks and reviews"
      bodyClassName="p-0"
    >
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No upcoming deadlines
        </p>
      ) : (
        <ol className="relative space-y-0 px-5 py-2">
          {items.map((item, index) => {
            const meta = typeMeta[item.type];
            const Icon = meta.icon;
            const overdue = new Date(item.date) < DEMO_NOW;
            return (
              <li key={item.id} className="relative flex gap-3 py-3">
                {index < items.length - 1 ? (
                  <span className="absolute top-10 bottom-0 left-[15px] w-px bg-border" />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                    meta.tone
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        overdue
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatShortDate(item.date)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {meta.label} · {item.projectName}
                    {overdue ? " · Overdue" : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
