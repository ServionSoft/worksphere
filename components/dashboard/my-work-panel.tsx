"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/shared/section-card";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { taskLabels } from "@/components/shared/status-badge";
import { formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { TaskStatus } from "@/lib/types";
import { toast } from "sonner";

const statuses: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
  "blocked",
];

export function MyWorkPanel() {
  const { tasks, updateTaskStatus } = useWorkspaceStore();
  const myTasks = tasks
    .filter((task) => !task.parentId && task.status !== "done")
    .slice(0, 5);

  return (
    <SectionCard
      title="My work"
      description="Tasks assigned to you"
      action={
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/my-work" />}
        >
          Open board
        </Button>
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {myTasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {task.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {task.projectName} · Due {formatShortDate(task.dueDate)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              <Select
                value={task.status}
                onValueChange={(value) => {
                  if (!value) return;
                  updateTaskStatus(task.id, value as TaskStatus);
                  toast.success("Task updated", {
                    description: `${task.title} → ${taskLabels[value as TaskStatus]}`,
                  });
                }}
              >
                <SelectTrigger size="sm" className="min-w-32">
                  <SelectValue>
                    {(value) =>
                      value ? taskLabels[value as TaskStatus] : "Status"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {taskLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </li>
        ))}
        {myTasks.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">
            You are all caught up.
          </li>
        ) : null}
      </ul>
    </SectionCard>
  );
}
