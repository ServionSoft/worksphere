"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { demoId } from "@/lib/demo-clock";
import { formatShortDate } from "@/lib/format";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

const columns: Array<{ id: TaskStatus; title: string }> = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
  { id: "blocked", title: "Blocked" },
];

export function GlobalBoards() {
  const { tasks, projects, updateTaskStatus } = useWorkspaceStore();
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const boardTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => !t.parentId)
      .filter((t) =>
        projectFilter === "all" ? true : t.projectId === projectFilter
      )
      .filter((t) => {
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.assigneeName.toLowerCase().includes(q) ||
          t.projectName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.order - b.order);
  }, [tasks, projectFilter, query]);

  const activeTask = boardTasks.find((t) => t.id === activeId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    const overColumn = columns.find((c) => c.id === overId)?.id;
    const overTask = boardTasks.find((t) => t.id === overId);
    const nextStatus = overColumn ?? overTask?.status;

    if (!nextStatus) return;
    const current = boardTasks.find((t) => t.id === taskId);
    if (!current || current.status === nextStatus) return;

    updateTaskStatus(taskId, nextStatus);
    toast.success("Task moved", {
      description: `${current.title} → ${columns.find((c) => c.id === nextStatus)?.title}`,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasks & Boards"
        description="Cross-project Kanban for every workspace task."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            New task
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, assignees, projects…"
            className="pl-8"
          />
        </div>
        <Select
          value={projectFilter}
          onValueChange={(v) => setProjectFilter(v ?? "all")}
        >
          <SelectTrigger className="min-w-44">
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
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => {
            const items = boardTasks.filter((t) => t.status === column.id);
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                count={items.length}
                tasks={items}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  count,
  tasks,
}: {
  id: TaskStatus;
  title: string;
  count: number;
  tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/30",
        isOver && "ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {title}
        </h3>
        <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-24 flex-col gap-2 px-2 pb-3">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <TaskCard task={task} handleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  handleProps,
}: {
  task: Task;
  dragging?: boolean;
  handleProps?: Record<string, unknown>;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        dragging && "shadow-md ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
          {...handleProps}
          aria-label="Drag task"
        >
          <GripVertical className="size-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">
            {task.title}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {task.projectName}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {task.assigneeName} · {formatShortDate(task.dueDate)}
          </p>
          <div className="mt-2">
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { projects, team, tasks, addTask } = useWorkspaceStore();
  const activeProjects = projects.filter((p) => !p.archived);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const resolvedProjectId = projectId || activeProjects[0]?.id || "";
  const resolvedAssigneeId = assigneeId || team[0]?.id || "";

  function reset() {
    setTitle("");
    setProjectId("");
    setAssigneeId("");
  }

  function handleCreate() {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    const project =
      activeProjects.find((p) => p.id === resolvedProjectId) ??
      activeProjects[0];
    const assignee =
      team.find((m) => m.id === resolvedAssigneeId) ?? team[0];
    if (!project || !assignee) {
      toast.error("Select a project and assignee");
      return;
    }

    const order =
      tasks.filter((t) => t.projectId === project.id && !t.parentId).length + 1;

    addTask({
      id: demoId("t"),
      title: title.trim(),
      description: "",
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
      order,
    });

    toast.success("Task created", { description: title.trim() });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a task to any project and assign an owner.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" htmlFor="board-task-title">
              Title
            </label>
            <Input
              id="board-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finalize API contract"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Project</label>
            <Select
              value={resolvedProjectId}
              onValueChange={(v) => setProjectId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue>
                  {activeProjects.find((p) => p.id === resolvedProjectId)
                    ?.name ?? "Select project"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Assignee</label>
            <Select
              value={resolvedAssigneeId}
              onValueChange={(v) => setAssigneeId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue>
                  {team.find((m) => m.id === resolvedAssigneeId)?.name ??
                    "Select assignee"}
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
