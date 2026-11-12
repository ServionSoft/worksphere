"use client";

import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatShortDate } from "@/lib/format";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block h-full rounded-xl outline-none transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
    >
      <article className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {project.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {project.clientName}
            </p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {project.description}
        </p>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium tabular-nums">{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={project.priority} />
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="size-3" />
            {project.teamSize}
          </span>
        </div>

        <div className="mt-auto mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <span>PM · {project.managerName}</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <CalendarDays className="size-3" />
            {formatShortDate(project.dueDate)}
          </span>
        </div>
      </article>
    </Link>
  );
}
