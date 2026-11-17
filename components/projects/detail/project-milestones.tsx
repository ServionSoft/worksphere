"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { SectionCard } from "@/components/shared/section-card";
import {
  MilestoneStatusBadge,
  milestoneLabels,
} from "@/components/shared/milestone-badge";
import { DEMO_NOW_ISO, demoId } from "@/lib/demo-clock";
import { formatDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import type { Milestone, MilestoneStatus, Task } from "@/lib/types";
import { toast } from "sonner";

const statuses: MilestoneStatus[] = [
  "upcoming",
  "in_progress",
  "completed",
  "missed",
];

interface ProjectMilestonesProps {
  projectId: string;
}

interface MilestoneFormState {
  title: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  deliverables: string;
  progress: string;
}

const emptyForm: MilestoneFormState = {
  title: "",
  description: "",
  dueDate: DEMO_NOW_ISO.slice(0, 10),
  status: "upcoming",
  deliverables: "",
  progress: "0",
};

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const {
    milestones,
    tasks,
    addMilestone,
    updateMilestone,
    updateMilestoneStatus,
    authorizeTaskForClient,
    updateTaskStatus,
    deleteMilestone,
  } = useWorkspaceStore();
  const items = milestones.filter((m) => m.projectId === projectId);
  const projectTasks = tasks.filter(
    (t) => t.projectId === projectId && !t.parentId
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MilestoneFormState>(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(milestone: Milestone) {
    setEditingId(milestone.id);
    setForm({
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate.slice(0, 10),
      status: milestone.status,
      deliverables: milestone.deliverables.join("\n"),
      progress: String(milestone.progress),
    });
    setDialogOpen(true);
  }

  function saveMilestone() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const deliverables = form.deliverables
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    const progress = Math.min(100, Math.max(0, Number(form.progress) || 0));

    if (editingId) {
      updateMilestone(editingId, {
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        status: form.status,
        deliverables,
        progress: form.status === "completed" ? 100 : progress,
      });
      toast.success("Milestone updated");
    } else {
      addMilestone({
        id: demoId("m"),
        projectId,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        status: form.status,
        deliverables,
        progress: form.status === "completed" ? 100 : progress,
      });
      toast.success("Milestone added");
    }
    setDialogOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add milestone
        </Button>
      </div>

      {items.map((milestone) => (
        <MilestoneCard
          key={milestone.id}
          milestone={milestone}
          linkedTasks={projectTasks.filter(
            (t) => t.milestoneId === milestone.id
          )}
          onApproveTask={(taskId) => {
            authorizeTaskForClient(taskId);
            toast.success("Sent to client", {
              description: "Client must approve before this task shows as Done",
            });
          }}
          onRequestRevision={(taskId) => {
            updateTaskStatus(taskId, "in_progress");
            toast.success("Revision requested", {
              description: "Task returned to the assignee",
            });
          }}
          onStatusChange={(status) => {
            updateMilestoneStatus(milestone.id, status);
            toast.success("Milestone updated", {
              description: `${milestone.title} → ${milestoneLabels[status]}`,
            });
          }}
          onEdit={() => openEdit(milestone)}
          onDelete={() => {
            deleteMilestone(milestone.id);
            toast.success("Milestone deleted", {
              description: milestone.title,
            });
          }}
        />
      ))}

      {items.length === 0 ? (
        <SectionCard title="Milestones" description="No milestones for this project">
          <p className="text-sm text-muted-foreground">
            Add the first milestone to start tracking delivery checkpoints.
          </p>
        </SectionCard>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit milestone" : "Add milestone"}
            </DialogTitle>
            <DialogDescription>
              Track delivery checkpoints for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium">Title</label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea
                className="mt-1"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Due date</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium">Progress %</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, progress: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  typeof v === "string" &&
                  setForm((p) => ({ ...p, status: v as MilestoneStatus }))
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {milestoneLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">
                Deliverables (one per line)
              </label>
              <Textarea
                className="mt-1"
                value={form.deliverables}
                onChange={(e) =>
                  setForm((p) => ({ ...p, deliverables: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMilestone}>
              {editingId ? "Save changes" : "Create milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneCard({
  milestone,
  linkedTasks,
  onApproveTask,
  onRequestRevision,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  milestone: Milestone;
  linkedTasks: Task[];
  onApproveTask: (taskId: string) => void;
  onRequestRevision: (taskId: string) => void;
  onStatusChange: (status: MilestoneStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const awaitingAdmin = linkedTasks.filter(
    (t) =>
      t.status === "review" &&
      !(t.authorizedForClient && t.clientApprovalStatus === "pending") &&
      t.clientApprovalStatus !== "approved"
  );
  const awaitingClient = linkedTasks.filter(
    (t) => t.authorizedForClient && t.clientApprovalStatus === "pending"
  );
  const allDone =
    linkedTasks.length > 0 &&
    linkedTasks.every(
      (t) =>
        t.status === "done" &&
        (t.requiresClientApproval === false ||
          t.clientApprovalStatus === "approved")
    );

  return (
    <SectionCard
      title={milestone.title}
      description={`Due ${formatDate(milestone.dueDate)}`}
      action={
        <div className="flex items-center gap-1.5">
          <MilestoneStatusBadge status={milestone.status} />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onEdit}
            aria-label="Edit milestone"
          >
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            aria-label="Delete milestone"
          >
            <Trash2 />
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">{milestone.description}</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium tabular-nums">{milestone.progress}%</span>
        </div>
        <Progress value={milestone.progress} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-foreground">
          Milestone tasks
        </p>
        {linkedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks linked. Assign tasks to this milestone from the task board.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {linkedTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.assigneeName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TaskStatusBadge status={task.status} />
                  {task.authorizedForClient &&
                  task.clientApprovalStatus === "pending" ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Awaiting client
                    </span>
                  ) : null}
                  {task.status === "review" &&
                  task.clientApprovalStatus !== "approved" &&
                  !(
                    task.authorizedForClient &&
                    task.clientApprovalStatus === "pending"
                  ) ? (
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="xs"
                        onClick={() => onApproveTask(task.id)}
                      >
                        Approve for client
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => onRequestRevision(task.id)}
                      >
                        Request revision
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {awaitingAdmin.length > 0 ? (
          <p className="mt-2 text-xs font-medium text-amber-800">
            {awaitingAdmin.length} task
            {awaitingAdmin.length === 1 ? "" : "s"} awaiting your approval
          </p>
        ) : null}
        {awaitingClient.length > 0 ? (
          <p className="mt-2 text-xs font-medium text-amber-800">
            {awaitingClient.length} task
            {awaitingClient.length === 1 ? "" : "s"} with client for sign-off
          </p>
        ) : null}
        {allDone && milestone.status !== "completed" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            All tasks client-approved — mark milestone Completed when ready.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-foreground">Deliverables</p>
        <ul className="flex flex-col gap-1.5">
          {milestone.deliverables.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              {item}
            </li>
          ))}
          {milestone.deliverables.length === 0 ? (
            <li className="text-sm text-muted-foreground">No deliverables listed.</li>
          ) : null}
        </ul>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Milestone status</span>
        <Select
          value={milestone.status}
          onValueChange={(v) => v && onStatusChange(v as MilestoneStatus)}
        >
          <SelectTrigger size="sm" className="min-w-32">
            <SelectValue>
              {(v) =>
                v ? milestoneLabels[v as MilestoneStatus] : "Status"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {milestoneLabels[s]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </SectionCard>
  );
}
