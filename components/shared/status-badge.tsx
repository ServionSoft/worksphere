import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectStatus, TaskStatus } from "@/lib/types";

const projectStyles: Record<ProjectStatus, string> = {
  planning: "bg-sky-50 text-sky-700 border-sky-200",
  active: "bg-indigo-50 text-indigo-700 border-indigo-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  at_risk: "bg-red-50 text-red-700 border-red-200",
};

const projectLabels: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  at_risk: "At Risk",
};

const taskStyles: Record<TaskStatus, string> = {
  todo: "bg-slate-50 text-slate-700 border-slate-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  review: "bg-violet-50 text-violet-700 border-violet-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
};

const taskLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", projectStyles[status])}
    >
      {projectLabels[status]}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", taskStyles[status])}
    >
      {taskLabels[status]}
    </Badge>
  );
}

export { projectLabels, taskLabels };
