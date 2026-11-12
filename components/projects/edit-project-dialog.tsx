"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Priority, Project, ProjectStatus } from "@/lib/types";

interface EditProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  description: string;
  clientId: string;
  managerId: string;
  budget: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  dueDate: string;
}

function formFromProject(project: Project): FormState {
  return {
    name: project.name,
    description: project.description,
    clientId: project.clientId,
    managerId: project.managerId,
    budget: String(project.budget),
    status: project.status,
    priority: project.priority,
    startDate: project.startDate.slice(0, 10),
    dueDate: project.dueDate.slice(0, 10),
  };
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const { updateProject, clients, team } = useWorkspaceStore();
  const [form, setForm] = useState<FormState | null>(() =>
    project ? formFromProject(project) : null
  );

  function handleOpenChange(next: boolean) {
    if (next && project) {
      setForm(formFromProject(project));
    }
    onOpenChange(next);
  }

  function handleSave() {
    if (!project || !form) return;
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    const client = clients.find((c) => c.id === form.clientId);
    const manager = team.find((m) => m.id === form.managerId);
    if (!client || !manager) {
      toast.error("Select a valid client and manager");
      return;
    }

    updateProject(project.id, {
      name: form.name.trim(),
      description: form.description.trim() || project.description,
      clientId: client.id,
      clientName: client.name,
      managerId: manager.id,
      managerName: manager.name,
      budget: Number(form.budget) || 0,
      status: form.status,
      priority: form.priority,
      startDate: form.startDate,
      dueDate: form.dueDate,
    });

    toast.success("Project updated", { description: form.name.trim() });
    onOpenChange(false);
  }

  if (!project || !form) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update project details, ownership, budget, and timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="edit-project-name">
              Project name
            </label>
            <Input
              id="edit-project-name"
              value={form.name}
              onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
              placeholder="e.g. Customer Portal Refresh"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="edit-project-desc">
              Description
            </label>
            <Textarea
              id="edit-project-desc"
              value={form.description}
              onChange={(e) =>
                setForm((p) => (p ? { ...p, description: e.target.value } : p))
              }
              placeholder="What is this project delivering?"
              className="min-h-20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">Client</span>
              <Select
                value={form.clientId}
                onValueChange={(v) =>
                  v && setForm((p) => (p ? { ...p, clientId: v } : p))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      clients.find((c) => c.id === value)?.name ?? "Select client"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                Project manager
              </span>
              <Select
                value={form.managerId}
                onValueChange={(v) =>
                  v && setForm((p) => (p ? { ...p, managerId: v } : p))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      team.find((m) => m.id === value)?.name ?? "Select manager"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {team.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">Priority</span>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  v &&
                  setForm((p) => (p ? { ...p, priority: v as Priority } : p))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) =>
                      value
                        ? String(value).charAt(0).toUpperCase() +
                          String(value).slice(1)
                        : "Priority"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">Status</span>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  v &&
                  setForm((p) =>
                    p ? { ...p, status: v as ProjectStatus } : p
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) => {
                      const labels: Record<string, string> = {
                        planning: "Planning",
                        active: "Active",
                        on_hold: "On Hold",
                        at_risk: "At Risk",
                        completed: "Completed",
                      };
                      return value
                        ? labels[String(value)] ?? String(value)
                        : "Status";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="edit-start-date"
              >
                Start date
              </label>
              <Input
                id="edit-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, startDate: e.target.value } : p))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="edit-due-date"
              >
                Due date
              </label>
              <Input
                id="edit-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, dueDate: e.target.value } : p))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="edit-budget"
              >
                Budget (USD)
              </label>
              <Input
                id="edit-budget"
                type="number"
                min={0}
                value={form.budget}
                onChange={(e) =>
                  setForm((p) => (p ? { ...p, budget: e.target.value } : p))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
