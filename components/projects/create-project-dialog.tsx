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
import { demoId } from "@/lib/demo-clock";
import { localDateInputValue } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Priority, ProjectStatus } from "@/lib/types";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const { addProject, clients, team, workspace } = useWorkspaceStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [budget, setBudget] = useState("50000");

  const resolvedClientId = clientId || clients[0]?.id || "";
  const resolvedManagerId = managerId || team[0]?.id || "";
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [startDate, setStartDate] = useState(() => localDateInputValue());
  const [dueDate, setDueDate] = useState("");

  function reset() {
    setName("");
    setDescription("");
    setClientId("");
    setManagerId("");
    setPriority("medium");
    setStatus("planning");
    setStartDate(localDateInputValue());
    setDueDate("");
    setBudget("50000");
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      // Recalculate today's local date every time the dialog opens.
      reset();
    }
    onOpenChange(next);
  }

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required");
      return;
    }
    const client = clients.find((c) => c.id === resolvedClientId) ?? clients[0];
    const manager = team.find((m) => m.id === resolvedManagerId) ?? team[0];
    if (!client || !manager) {
      toast.error("Add a client and team member first");
      return;
    }

    addProject({
      id: demoId("p"),
      workspaceId: workspace.id,
      name: name.trim(),
      description: description.trim() || "Newly created project",
      clientId: client.id,
      clientName: client.name,
      managerId: manager.id,
      managerName: manager.name,
      status,
      progress: 0,
      priority,
      startDate,
      dueDate,
      teamSize: 1,
      budget: Number(budget) || 50000,
      spent: 0,
      currency: "USD",
    });

    toast.success("Project created", { description: name.trim() });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Set up a new project in your workspace. You can refine details later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="project-name">
              Project name
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Portal Refresh"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="project-desc">
              Description
            </label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project delivering?"
              className="min-h-20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">Client</span>
              <Select
                value={resolvedClientId}
                onValueChange={(v) => v && setClientId(v)}
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
                value={resolvedManagerId}
                onValueChange={(v) => v && setManagerId(v)}
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
                value={priority}
                onValueChange={(v) => v && setPriority(v as Priority)}
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
                value={status}
                onValueChange={(v) => v && setStatus(v as ProjectStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value) => {
                      const labels: Record<string, string> = {
                        planning: "Planning",
                        active: "Active",
                        on_hold: "On Hold",
                        at_risk: "At Risk",
                      };
                      return value ? labels[String(value)] ?? String(value) : "Status";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-foreground"
                htmlFor="start-date"
              >
                Start date
              </label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="due-date">
                Due date
              </label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="budget">
                Budget (USD)
              </label>
              <Input
                id="budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
