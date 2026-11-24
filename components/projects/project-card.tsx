"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Archive,
  CalendarDays,
  Flag,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
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
import { cn } from "@/lib/utils";

export type ProjectCardPrimaryAction =
  | "add_milestone"
  | "manage_milestones"
  | "continue_planning"
  | "manage_production"
  | "view_delivery";

export function resolveProjectCardActions(
  project: Project,
  milestoneCount: number
): {
  primary: ProjectCardPrimaryAction;
  primaryLabel: string;
  showAddMilestone: boolean;
  showManage: boolean;
  manageLabel: string;
} {
  if (project.status === "completed") {
    return {
      primary: "view_delivery",
      primaryLabel: "View Delivery",
      showAddMilestone: false,
      showManage: true,
      manageLabel: "Manage Milestones",
    };
  }

  if (project.status === "planning") {
    if (milestoneCount === 0) {
      return {
        primary: "add_milestone",
        primaryLabel: "Add Milestone",
        showAddMilestone: true,
        showManage: false,
        manageLabel: "Manage Milestones",
      };
    }
    return {
      primary: "continue_planning",
      primaryLabel: "Continue Planning",
      showAddMilestone: true,
      showManage: true,
      manageLabel: "Continue Planning",
    };
  }

  if (project.status === "active") {
    return {
      primary: "add_milestone",
      primaryLabel: "Add Milestone",
      showAddMilestone: true,
      showManage: true,
      manageLabel: "Manage Production",
    };
  }

  return {
    primary: "add_milestone",
    primaryLabel: "Add Milestone",
    showAddMilestone: true,
    showManage: milestoneCount > 0,
    manageLabel: milestoneCount > 0 ? "Manage Milestones" : "Manage",
  };
}

interface ProjectCardProps {
  project: Project;
  milestoneCount?: number;
  canManage?: boolean;
  canDelete?: boolean;
  onAddMilestone?: (project: Project) => void;
  onManageMilestones?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectCard({
  project,
  milestoneCount = 0,
  canManage = false,
  canDelete = false,
  onAddMilestone,
  onManageMilestones,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const router = useRouter();
  const actions = resolveProjectCardActions(project, milestoneCount);
  const showAdd =
    canManage && actions.showAddMilestone && Boolean(onAddMilestone);
  const showManage =
    canManage && actions.showManage && Boolean(onManageMilestones);
  const hasOverflow = Boolean(
    onEdit || onArchive || (canDelete && onDelete) || canManage
  );

  function handleManageClick() {
    if (!onManageMilestones) return;
    onManageMilestones(project);
  }

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
          {hasOverflow ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="text-muted-foreground"
                    title="More actions"
                  />
                }
              >
                <MoreHorizontal className="size-3.5" />
                <span className="sr-only">Project actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <Flag className="size-3.5" />
                  Open Project
                </DropdownMenuItem>
                {showAdd ? (
                  <DropdownMenuItem onClick={() => onAddMilestone?.(project)}>
                    <Plus className="size-3.5" />
                    Add Milestone
                  </DropdownMenuItem>
                ) : null}
                {canManage && onManageMilestones ? (
                  <DropdownMenuItem onClick={() => onManageMilestones(project)}>
                    <Settings2 className="size-3.5" />
                    Manage Milestones
                  </DropdownMenuItem>
                ) : null}
                {onEdit ? (
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Pencil className="size-3.5" />
                    Edit Project
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/projects/${project.id}?tab=activity`)
                  }
                >
                  <Activity className="size-3.5" />
                  View Activity
                </DropdownMenuItem>
                {onArchive ? (
                  <DropdownMenuItem onClick={() => onArchive(project)}>
                    <Archive className="size-3.5" />
                    Archive Project
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
                      Delete Project
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <Link
          href={`/projects/${project.id}`}
          className="outline-none"
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
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Flag className="size-3" />
              {milestoneCount} milestone{milestoneCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
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

        {canManage ? (
          <div
            className="mt-3 flex flex-wrap items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {showAdd ? (
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddMilestone?.(project);
                }}
                title="Add milestone"
              >
                <Plus data-icon="inline-start" />
                Add Milestone
              </Button>
            ) : actions.primary === "view_delivery" ? (
              <Button
                size="sm"
                className="flex-1 sm:flex-none"
                render={<Link href={`/projects/${project.id}`} />}
                nativeButton={false}
                title="View delivery"
              >
                View Delivery
              </Button>
            ) : null}

            {showManage ? (
              <Button
                size="sm"
                variant="outline"
                className={cn(!showAdd && "flex-1 sm:flex-none")}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleManageClick();
                }}
                title={actions.manageLabel}
              >
                <Settings2 data-icon="inline-start" />
                {actions.manageLabel}
              </Button>
            ) : null}

          </div>
        ) : null}
      </div>
    </article>
  );
}
