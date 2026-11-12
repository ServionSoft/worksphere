"use client";

import { useState } from "react";
import { CalendarDays, FolderPlus, ListPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentUser } from "@/lib/mock-data";
import { greetingForHour } from "@/lib/format";
import { demoId } from "@/lib/demo-clock";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

interface WelcomeSectionProps {
  onCreateProject: () => void;
}

export function WelcomeSection({ onCreateProject }: WelcomeSectionProps) {
  const { workspace, projects, team, tasks, addTask, addTeamMember } =
    useWorkspaceStore();
  const [taskOpen, setTaskOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  const activeProjects = projects.filter((p) => !p.archived);
  const resolvedProjectId = taskProjectId || activeProjects[0]?.id || "";
  const resolvedAssigneeId = taskAssigneeId || team[0]?.id || "";

  const today = new Date("2026-03-11").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function resetTaskForm() {
    setTaskTitle("");
    setTaskProjectId("");
    setTaskAssigneeId("");
  }

  function resetInviteForm() {
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Member");
  }

  function handleCreateTask() {
    if (!taskTitle.trim()) {
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
      title: taskTitle.trim(),
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

    toast.success("Task created", { description: taskTitle.trim() });
    resetTaskForm();
    setTaskOpen(false);
  }

  function handleInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }

    addTeamMember({
      id: demoId("u"),
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole.trim() || "Member",
      workspaceId: workspace.id,
      active: true,
      permissionRole: "internal_member",
    });

    toast.success("Invite added", {
      description: `${inviteName.trim()} joined the workspace (demo).`,
    });
    resetInviteForm();
    setInviteOpen(false);
  }

  return (
    <>
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {workspace.name}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {greetingForHour(10)}, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {today} · Here is what needs attention today
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onCreateProject}>
            <FolderPlus data-icon="inline-start" />
            New project
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTaskOpen(true)}
          >
            <ListPlus data-icon="inline-start" />
            Add task
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInviteOpen(true)}
          >
            <Users data-icon="inline-start" />
            Invite
          </Button>
        </div>
      </section>

      <Dialog
        open={taskOpen}
        onOpenChange={(open) => {
          setTaskOpen(open);
          if (!open) resetTaskForm();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>
              Add a task to a project and assign a teammate.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" htmlFor="welcome-task-title">
                Title
              </label>
              <Input
                id="welcome-task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Finalize API contract"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Project</label>
              <Select
                value={resolvedProjectId}
                onValueChange={(v) => setTaskProjectId(v ?? "")}
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
                onValueChange={(v) => setTaskAssigneeId(v ?? "")}
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
            <Button variant="outline" onClick={() => setTaskOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask}>Create task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) resetInviteForm();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Invite teammate</DialogTitle>
            <DialogDescription>
              Add a member to this workspace (stored locally in the demo).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" htmlFor="welcome-invite-name">
                Name
              </label>
              <Input
                id="welcome-invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium"
                htmlFor="welcome-invite-email"
              >
                Email
              </label>
              <Input
                id="welcome-invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" htmlFor="welcome-invite-role">
                Role
              </label>
              <Input
                id="welcome-invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                placeholder="Member"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite}>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
