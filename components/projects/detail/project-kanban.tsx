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
import { GripVertical } from "lucide-react";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const columns: Array<{ id: TaskStatus; title: string }> = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

interface ProjectKanbanProps {
  projectId: string;
}

export function ProjectKanban({ projectId }: ProjectKanbanProps) {
  const { tasks, updateTaskStatus } = useWorkspaceStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const projectTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.projectId === projectId && !t.parentId)
        .sort((a, b) => a.order - b.order),
    [tasks, projectId]
  );

  const activeTask = projectTasks.find((t) => t.id === activeId) ?? null;

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
    const overTask = projectTasks.find((t) => t.id === overId);
    const nextStatus = overColumn ?? overTask?.status;

    if (!nextStatus) return;
    const current = projectTasks.find((t) => t.id === taskId);
    if (!current || current.status === nextStatus) return;

    updateTaskStatus(taskId, nextStatus);
    toast.success("Task moved", {
      description: `${current.title} → ${columns.find((c) => c.id === nextStatus)?.title}`,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const items = projectTasks.filter((t) => t.status === column.id);
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
        <div className="flex flex-col gap-2 px-2 pb-3 min-h-24">
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
          <p className="mt-1 text-[11px] text-muted-foreground">
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
