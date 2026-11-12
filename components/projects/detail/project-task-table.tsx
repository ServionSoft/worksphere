"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Plus,
  Search,
  ArrowUpDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { taskLabels } from "@/components/shared/status-badge";
import { formatShortDate } from "@/lib/format";
import { demoId } from "@/lib/demo-clock";
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
  const { tasks, updateTaskStatus, updateTask, addTask, deleteTask, team } =
    useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [depsTask, setDepsTask] = useState<Task | null>(null);
  const [depsDraft, setDepsDraft] = useState<string[]>([]);

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
    const assignee = team[0];
    if (!assignee) {
      toast.error("No team members available");
      return;
    }
    addTask({
      id: demoId("t"),
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

  function handleAddSubtask(parent: Task) {
    const assignee = team[0];
    if (!assignee) {
      toast.error("No team members available");
      return;
    }
    const kids = subtasksOf(parent.id);
    addTask({
      id: demoId("t"),
      title: "New subtask",
      description: "Describe the subtask",
      projectId: project.id,
      projectName: project.name,
      status: "todo",
      priority: parent.priority,
      startDate: parent.startDate,
      dueDate: parent.dueDate,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      parentId: parent.id,
      dependsOn: [],
      milestoneId: parent.milestoneId ?? null,
      order: kids.length + 1,
    });
    setExpanded((prev) => ({ ...prev, [parent.id]: true }));
    toast.success("Subtask added");
  }

  function handleDelete(task: Task) {
    const isParent = !task.parentId;
    const childCount = isParent ? subtasksOf(task.id).length : 0;
    const message =
      childCount > 0
        ? `Delete "${task.title}" and its ${childCount} subtask(s)?`
        : `Delete "${task.title}"?`;
    if (!window.confirm(message)) return;
    deleteTask(task.id);
    toast.success("Task deleted", { description: task.title });
  }

  function handleTitleBlur(task: Task, nextTitle: string) {
    const title = nextTitle.trim();
    if (!title || title === task.title) return;
    updateTask(task.id, { title });
    toast.success("Title updated");
  }

  function handleAssigneeChange(taskId: string, memberId: string) {
    const member = team.find((m) => m.id === memberId);
    if (!member) return;
    updateTask(taskId, {
      assigneeId: member.id,
      assigneeName: member.name,
    });
    toast.success("Assignee updated");
  }

  function openDepsEditor(task: Task) {
    setDepsTask(task);
    setDepsDraft([...task.dependsOn]);
  }

  function toggleDep(id: string, checked: boolean) {
    setDepsDraft((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  }

  function saveDependencies() {
    if (!depsTask) return;
    const mutual = depsDraft.find((depId) => {
      const other = projectTasks.find((t) => t.id === depId);
      return other?.dependsOn.includes(depsTask.id);
    });
    if (mutual) {
      const otherTitle =
        projectTasks.find((t) => t.id === mutual)?.title ?? mutual;
      toast.error("Circular dependency", {
        description: `"${otherTitle}" already depends on this task.`,
      });
      return;
    }
    updateTask(depsTask.id, { dependsOn: depsDraft });
    toast.success("Dependencies updated");
    setDepsTask(null);
  }

  function subtasksOf(parentId: string) {
    return projectTasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  function dependencyLabel(task: Task) {
    if (!task.dependsOn.length) return "—";
    return task.dependsOn
      .map((id) => projectTasks.find((t) => t.id === id)?.title ?? id)
      .join(", ");
  }

  function siblingCandidates(task: Task) {
    if (task.parentId) {
      return projectTasks.filter(
        (t) => t.parentId === task.parentId && t.id !== task.id
      );
    }
    return projectTasks.filter((t) => !t.parentId && t.id !== task.id);
  }

  function renderTaskRow(task: Task, opts: { isSubtask?: boolean; kids?: Task[]; open?: boolean }) {
    const { isSubtask = false, kids = [], open = false } = opts;
    return (
      <TableRow key={task.id} className={isSubtask ? "bg-muted/20" : undefined}>
        <TableCell>
          {!isSubtask && kids.length ? (
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
        <TableCell className={isSubtask ? "pl-8" : undefined}>
          <div className="flex items-center gap-1.5">
            {isSubtask ? (
              <span className="text-muted-foreground">↳</span>
            ) : null}
            <Input
              defaultValue={task.title}
              key={`${task.id}-${task.title}`}
              className="h-8 border-transparent bg-transparent px-1.5 font-medium shadow-none focus-visible:border-input focus-visible:bg-background"
              onBlur={(e) => handleTitleBlur(task, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              aria-label={isSubtask ? "Subtask title" : "Task title"}
            />
          </div>
        </TableCell>
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
                {(v) => (v ? taskLabels[v as TaskStatus] : "Status")}
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
              handleAssigneeChange(task.id, v);
            }}
          >
            <SelectTrigger size="sm" className="min-w-32">
              <SelectValue>
                {(v) => team.find((m) => m.id === v)?.name ?? "Assignee"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {team.map((m) => (
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
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            {!isSubtask ? (
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleAddSubtask(task)}
                aria-label="Add subtask"
                title="Add subtask"
              >
                <Plus />
              </Button>
            ) : null}
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => openDepsEditor(task)}
              aria-label="Edit dependencies"
              title="Edit dependencies"
            >
              <GitBranch />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => handleDelete(task)}
              aria-label="Delete task"
              title="Delete"
            >
              <Trash2 />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  const depCandidates = depsTask ? siblingCandidates(depsTask) : [];

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map((task) => {
                const kids = subtasksOf(task.id);
                const open = Boolean(expanded[task.id]);
                return (
                  <Fragment key={task.id}>
                    {renderTaskRow(task, { kids, open })}
                    {open
                      ? kids.map((sub) =>
                          renderTaskRow(sub, { isSubtask: true })
                        )
                      : null}
                  </Fragment>
                );
              })}
              {parents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
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

      <Dialog
        open={Boolean(depsTask)}
        onOpenChange={(open) => {
          if (!open) setDepsTask(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Dependencies</DialogTitle>
            <DialogDescription>
              Choose sibling tasks that must finish before{" "}
              <span className="font-medium text-foreground">
                {depsTask?.title}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto py-1">
            {depCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sibling tasks available.
              </p>
            ) : (
              depCandidates.map((candidate) => {
                const checked = depsDraft.includes(candidate.id);
                return (
                  <label
                    key={candidate.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleDep(candidate.id, value === true)
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {candidate.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {taskLabels[candidate.status]}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepsTask(null)}>
              Cancel
            </Button>
            <Button onClick={saveDependencies}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
