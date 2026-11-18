"use client";

import Link from "next/link";
import {
  Archive,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatShortDate } from "@/lib/format";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  canDelete?: boolean;
  onEdit?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({
  project,
  canDelete = false,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const hasActions = Boolean(onEdit || onArchive || (canDelete && onDelete));

  return (
    <article className="relative flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/projects/${project.id}`} className="min-w-0 outline-none">
          <h3 className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline">
            {project.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.clientName}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <ProjectStatusBadge status={project.status} />
          {hasActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="text-muted-foreground"
                  />
                }
              >
                <MoreHorizontal className="size-3.5" />
                <span className="sr-only">Project actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Pencil className="size-3.5" />
                    Edit
                  </DropdownMenuItem>
                ) : null}
                {onArchive ? (
                  <DropdownMenuItem onClick={() => onArchive(project)}>
                    <Archive className="size-3.5" />
                    Archive
                  </DropdownMenuItem>
                ) : null}
                {canDelete && onDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(project)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete permanently
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <Link
        href={`/projects/${project.id}`}
        className="mt-3 flex flex-1 flex-col outline-none"
      >
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
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
            <span>
              Deadline{" "}
              <span className="font-medium text-foreground">
                {formatShortDate(project.dueDate)}
              </span>
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
