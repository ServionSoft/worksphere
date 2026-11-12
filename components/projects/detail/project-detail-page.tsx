"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ProjectOverviewTab } from "@/components/projects/detail/project-overview-tab";
import { ProjectKanban } from "@/components/projects/detail/project-kanban";
import { ProjectTaskTable } from "@/components/projects/detail/project-task-table";
import { ProjectGantt } from "@/components/projects/detail/project-gantt";
import { ProjectMilestones } from "@/components/projects/detail/project-milestones";
import { ProjectDocuments } from "@/components/projects/detail/project-documents";
import { ProjectApprovals } from "@/components/projects/detail/project-approvals";
import { ProjectActivity } from "@/components/projects/detail/project-activity";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

interface ProjectDetailPageProps {
  projectId: string;
}

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const {
    projects,
    tasks,
    milestones,
    addTask,
  } = useWorkspaceStore();
  const [tab, setTab] = useLocalStorage(
    `worksphere.project.${projectId}.tab`,
    "overview"
  );
  const [mountedTab, setMountedTab] = useState(tab);

  const project = projects.find((p) => p.id === projectId);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId),
    [tasks, projectId]
  );
  const projectMilestones = useMemo(
    () => milestones.filter((m) => m.projectId === projectId),
    [milestones, projectId]
  );

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-24 text-center">
        <p className="text-base font-semibold">Project not found</p>
        <p className="text-sm text-muted-foreground">
          This project may have been removed or the link is invalid.
        </p>
        <Button render={<Link href="/projects" />} nativeButton={false}>
          Back to projects
        </Button>
      </div>
    );
  }

  function quickAddTask() {
    addTask({
      id: `t${Date.now()}`,
      title: "Untitled task",
      description: "New work item",
      projectId: project!.id,
      projectName: project!.name,
      status: "todo",
      priority: "medium",
      startDate: "2026-03-11",
      dueDate: project!.dueDate,
      assigneeId: project!.managerId,
      assigneeName: project!.managerName,
      parentId: null,
      dependsOn: [],
      milestoneId: null,
      order: projectTasks.filter((t) => !t.parentId).length + 1,
    });
    setMountedTab("tasks");
    setTab("tasks");
    toast.success("Task created");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2"
              nativeButton={false}
              render={<Link href="/projects" />}
            >
              <ArrowLeft data-icon="inline-start" />
              Projects
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {project.name}
              </h1>
              <ProjectStatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.clientName} · PM {project.managerName} ·{" "}
              {formatDate(project.startDate)} – {formatDate(project.dueDate)} ·{" "}
              {formatCurrency(project.spent, project.currency, true)} /{" "}
              {formatCurrency(project.budget, project.currency, true)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={quickAddTask}>
              <Plus data-icon="inline-start" />
              Add task
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setMountedTab("approvals");
                setTab("approvals");
                toast.message("Open Approvals to submit work");
              }}
            >
              Submit for approval
            </Button>
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-medium tabular-nums">{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>
      </div>

      <Tabs
        value={mountedTab}
        onValueChange={(value) => {
          if (typeof value === "string") {
            setMountedTab(value);
            setTab(value);
          }
        }}
      >
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectOverviewTab
            project={project}
            tasks={projectTasks}
            milestones={projectMilestones}
          />
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          <ProjectKanban projectId={project.id} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <ProjectTaskTable project={project} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <ProjectGantt project={project} tasks={projectTasks} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <ProjectMilestones projectId={project.id} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <ProjectDocuments projectId={project.id} />
        </TabsContent>
        <TabsContent value="approvals" className="mt-4">
          <ProjectApprovals projectId={project.id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ProjectActivity projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
