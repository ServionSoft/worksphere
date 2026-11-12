"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { TaskStatusBadge, taskLabels } from "@/components/shared/status-badge";
import { formatShortDate } from "@/lib/format";
import { teamMembers } from "@/lib/mock-data";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Priority, Project, Task, TaskStatus } from "@/lib/types";
import { toast } from "sonner";

type SortKey = "title" | "dueDate" | "priority" | "status";

const statuses: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
  "blocked",
];

const priorityRank: Record<Priority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

interface ProjectTaskTableProps {
  project: Project;
}

export function ProjectTaskTable({ project }: ProjectTaskTableProps) {
  const { tasks, updateTaskStatus, updateTask, addTask } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === project.id),
    [tasks, project.id]
  );

  const parents = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projectTasks.filter((t) => !t.parentId);
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority === priorityFilter);
    }
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.assigneeName.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      if (sortKey === "dueDate")
        cmp = a.dueDate.localeCompare(b.dueDate);
      if (sortKey === "priority")
        cmp = priorityRank[a.priority] - priorityRank[b.priority];
      if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [projectTasks, query, statusFilter, priorityFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleAddTask() {
    const assignee = teamMembers[0];
    addTask({
      id: `t${Date.now()}`,
      title: "New task",
      description: "Describe the work item",
      projectId: project.id,
      projectName: project.name,
      status: "todo",
      priority: "medium",
      startDate: "2026-03-11",
      dueDate: project.dueDate,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      parentId: null,
      dependsOn: [],
      milestoneId: null,
      order: parents.length + 1,
    });
    toast.success("Task added");
  }

  function subtasksOf(parentId: string) {
    return projectTasks.filter((t) => t.parentId === parentId);
  }

  function dependencyLabel(task: Task) {
    if (!task.dependsOn.length) return "—";
    return task.dependsOn
      .map((id) => projectTasks.find((t) => t.id === id)?.title ?? id)
      .join(", ");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v as "all" | TaskStatus)}
          >
            <SelectTrigger className="min-w-32">
              <SelectValue>
                {(v) =>
                  !v || v === "all"
                    ? "All statuses"
                    : taskLabels[v as TaskStatus]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {taskLabels[s]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(v) => v && setPriorityFilter(v as "all" | Priority)}
          >
            <SelectTrigger className="min-w-28">
              <SelectValue>
                {(v) =>
                  !v || v === "all"
                    ? "All priorities"
                    : String(v).charAt(0).toUpperCase() + String(v).slice(1)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddTask}>
            <Plus data-icon="inline-start" />
            Add task
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8" />
                <TableHead>
                  <SortButton label="Task" onClick={() => toggleSort("title")} />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Status"
                    onClick={() => toggleSort("status")}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Priority"
                    onClick={() => toggleSort("priority")}
                  />
                </TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>
                  <SortButton
                    label="Due"
                    onClick={() => toggleSort("dueDate")}
                  />
                </TableHead>
                <TableHead>Depends on</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map((task) => {
                const kids = subtasksOf(task.id);
                const open = expanded[task.id];
                return (
                  <Fragment key={task.id}>
                    <TableRow>
                      <TableCell>
                        {kids.length ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [task.id]: !prev[task.id],
                              }))
                            }
                            aria-label="Toggle subtasks"
                          >
                            {open ? <ChevronDown /> : <ChevronRight />}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Select
                          value={task.status}
                          onValueChange={(v) => {
                            if (!v) return;
                            updateTaskStatus(task.id, v as TaskStatus);
                          }}
                        >
                          <SelectTrigger size="sm" className="min-w-28">
                            <SelectValue>
                              {(v) =>
                                v ? taskLabels[v as TaskStatus] : "Status"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {taskLabels[s]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={task.assigneeId}
                          onValueChange={(v) => {
                            if (!v) return;
                            const member = teamMembers.find((m) => m.id === v);
                            if (!member) return;
                            updateTask(task.id, {
                              assigneeId: member.id,
                              assigneeName: member.name,
                            });
                            toast.success("Assignee updated");
                          }}
                        >
                          <SelectTrigger size="sm" className="min-w-32">
                            <SelectValue>
                              {(v) =>
                                teamMembers.find((m) => m.id === v)?.name ??
                                "Assignee"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {teamMembers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatShortDate(task.dueDate)}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                        {dependencyLabel(task)}
                      </TableCell>
                    </TableRow>
                    {open
                      ? kids.map((sub) => (
                          <TableRow key={sub.id} className="bg-muted/20">
                            <TableCell />
                            <TableCell className="pl-8 text-sm text-muted-foreground">
                              ↳ {sub.title}
                            </TableCell>
                            <TableCell>
                              <TaskStatusBadge status={sub.status} />
                            </TableCell>
                            <TableCell>
                              <PriorityBadge priority={sub.priority} />
                            </TableCell>
                            <TableCell>{sub.assigneeName}</TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {formatShortDate(sub.dueDate)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {dependencyLabel(sub)}
                            </TableCell>
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                );
              })}
              {parents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No tasks match your filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function SortButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="size-3" />
    </button>
  );
}
