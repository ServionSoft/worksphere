"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/components/shared/section-card";
import { ProjectStatusBadge, TaskStatusBadge } from "@/components/shared/status-badge";
import { MilestoneStatusBadge } from "@/components/shared/milestone-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ProjectGantt } from "@/components/projects/detail/project-gantt";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatDate, formatShortDate } from "@/lib/format";
import {
  developerAssignments,
  developerMyTasks,
  developerProjectActivity,
  developerProjectDocuments,
  developerProjectMilestones,
  developerProjectTasks,
  developerProjects,
  productionStage,
} from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Task, TaskStatus } from "@/lib/types";
import {
  TaskSubmissionHistory,
  TaskSubmitWorkDialog,
} from "@/components/developer/task-submit-work-dialog";
import { toast } from "sonner";

/** Working statuses — final submit uses Submit Work form, not a bare review flip. */
const developerWorkStatuses: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
];

export function DeveloperProjectDetail({ projectId }: { projectId: string }) {
  const { user } = useRequiredAuth();
  const {
    projects,
    assignments,
    tasks,
    milestones,
    documents,
    activity,
    workSubmissions,
    updateTaskStatus,
  } = useWorkspaceStore();
  const [tab, setTab] = useState("overview");
  const [submitTask, setSubmitTask] = useState<Task | null>(null);

  const allowed = developerProjects(projects, assignments, user, tasks);
  const project = allowed.find((p) => p.id === projectId);

  const projectTasks = useMemo(
    () => developerProjectTasks(tasks, projectId),
    [tasks, projectId]
  );
  const myTasks = useMemo(
    () => developerMyTasks(tasks, projectId, user),
    [tasks, projectId, user]
  );
  const projectMilestones = developerProjectMilestones(milestones, projectId);
  const projectDocs = developerProjectDocuments(documents, projectId);
  const feed = developerProjectActivity(activity, projectId);
  const linkedAssignments = developerAssignments(assignments, user).filter(
    (a) => a.projectId === projectId
  );
  const linkedSubs = workSubmissions.filter(
    (w) =>
      linkedAssignments.some((a) => a.id === w.assignmentId) ||
      (w.taskId && myTasks.some((t) => t.id === w.taskId)) ||
      w.projectId === projectId
  );

  if (!project) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
        <p className="font-semibold">Project unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You only see projects you are authorized for via direct task or marketplace assignment.
        </p>
        <Button
          className="mt-4"
          render={<Link href="/developer/projects" />}
          nativeButton={false}
        >
          Back to projects
        </Button>
      </div>
    );
  }

  const completed = projectTasks.filter((t) => t.status === "done").length;
  const inProgress = projectTasks.filter((t) =>
    ["in_progress", "review"].includes(t.status)
  ).length;
  const upcoming = projectTasks.filter((t) => t.status === "todo").length;
  const myOpen = myTasks.filter((t) => t.status !== "done").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          render={<Link href="/developer/projects" />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          My Projects
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          PM {project.managerName} · {productionStage(project.progress)} ·{" "}
          {formatDate(project.startDate)} – {formatDate(project.dueDate)}
        </p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="tabular-nums">{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Team tasks done" value={completed} />
          <Stat label="In progress" value={inProgress} />
          <Stat label="Upcoming" value={upcoming} />
          <Stat label="My open tasks" value={myOpen} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => typeof v === "string" && setTab(v)}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="board">Project Tasks</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Project information">
              <p className="text-sm text-muted-foreground">{project.description}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Project manager" value={project.managerName} />
                <Info
                  label="Production stage"
                  value={productionStage(project.progress)}
                />
                <Info label="Start date" value={formatDate(project.startDate)} />
                <Info label="Target delivery" value={formatDate(project.dueDate)} />
                <Info label="Team size" value={String(project.teamSize)} />
                <Info
                  label="Your assignments"
                  value={String(linkedAssignments.length)}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Internal budgets and private developer earnings of others stay
                hidden.
              </p>
            </SectionCard>

            <SectionCard title="Delivery focus">
              <ul className="flex flex-col gap-2">
                {projectMilestones.slice(0, 3).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {formatShortDate(m.dueDate)} · {m.progress}%
                      </p>
                    </div>
                    <MilestoneStatusBadge status={m.status} />
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Recent submissions
                </p>
                {linkedSubs.slice(0, 3).map((s) => (
                  <p key={s.id} className="truncate text-sm">
                    v{s.version} · {s.title}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({s.clientApprovalStatus})
                    </span>
                  </p>
                ))}
                {linkedSubs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No submissions on this project yet.
                  </p>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="my-tasks" className="mt-4">
          <SectionCard
            title="Tasks assigned to you"
            description="Work each task, then set Review — admin approves Done."
            bodyClassName="p-0"
          >
            {myTasks.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No project tasks assigned to you yet. Track marketplace checklist
                work under Assignments.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {myTasks.map((task) => {
                  const milestone = projectMilestones.find(
                    (m) => m.id === task.milestoneId
                  );
                  return (
                    <li key={task.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {task.description}
                          </p>
                          {(task.startDate ||
                            task.dueDate ||
                            milestone) && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {[
                                task.startDate || task.dueDate
                                  ? `${formatShortDate(task.startDate)} – ${formatShortDate(task.dueDate)}`
                                  : null,
                                milestone?.title,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={task.priority} />
                          <TaskStatusBadge status={task.status} />
                        </div>
                      </div>
                      {task.status === "done" ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Approved by admin / client.
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {developerWorkStatuses.map((status) => (
                              <Button
                                key={status}
                                size="xs"
                                variant={
                                  task.status === status
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() => {
                                  updateTaskStatus(task.id, status);
                                  toast.success("Task status updated");
                                }}
                              >
                                {status.replace("_", " ")}
                              </Button>
                            ))}
                            {task.status !== "review" ? (
                              <Button
                                size="xs"
                                onClick={() => setSubmitTask(task)}
                              >
                                Submit Work
                              </Button>
                            ) : (
                              <span className="text-xs text-amber-800">
                                Awaiting internal review
                              </span>
                            )}
                          </div>
                          <TaskSubmissionHistory taskId={task.id} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <SectionCard
            title="Project task board"
            description="Full project context — update status only on tasks assigned to you."
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-border">
              {projectTasks.map((task) => {
                const mine = task.assigneeId === user.id;
                return (
                  <li key={task.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {task.title}
                          {mine ? (
                            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              You
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.assigneeName} · {formatShortDate(task.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={task.priority} />
                        <TaskStatusBadge status={task.status} />
                      </div>
                    </div>
                    {mine && task.status !== "done" ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {developerWorkStatuses.map((status) => (
                            <Button
                              key={status}
                              size="xs"
                              variant={
                                task.status === status ? "secondary" : "outline"
                              }
                              onClick={() => {
                                updateTaskStatus(task.id, status);
                                toast.success("Task updated");
                              }}
                            >
                              {status.replace("_", " ")}
                            </Button>
                          ))}
                          {task.status !== "review" ? (
                            <Button
                              size="xs"
                              onClick={() => setSubmitTask(task)}
                            >
                              Submit Work
                            </Button>
                          ) : (
                            <span className="text-xs text-amber-800">
                              Awaiting internal review
                            </span>
                          )}
                        </div>
                        <TaskSubmissionHistory taskId={task.id} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Each milestone has its own tasks. You work them, submit for
              approval, and admin marks Done. Admin also completes the
              milestone.
            </p>
            {projectMilestones.map((m) => {
              const linkedTasks = projectTasks.filter(
                (t) => t.milestoneId === m.id
              );
              const myLinked = linkedTasks.filter(
                (t) => t.assigneeId === user.id
              );
              const awaitingAdmin = myLinked.filter(
                (t) => t.status === "review"
              ).length;
              return (
                <SectionCard
                  key={m.id}
                  title={m.title}
                  description={`Due ${formatDate(m.dueDate)} · ${myLinked.length} of your tasks`}
                  action={<MilestoneStatusBadge status={m.status} />}
                >
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Milestone progress
                      </span>
                      <span className="tabular-nums">{m.progress}%</span>
                    </div>
                    <Progress value={m.progress} />
                  </div>
                  {awaitingAdmin > 0 ? (
                    <p className="mt-2 text-xs font-medium text-amber-800">
                      {awaitingAdmin} task
                      {awaitingAdmin === 1 ? "" : "s"} waiting for admin
                      approval
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium">Your tasks</p>
                    {myLinked.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No tasks assigned to you on this milestone yet.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {myLinked.map((task) => (
                          <li
                            key={task.id}
                            className="rounded-lg border border-border px-3 py-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {task.title}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Due {formatShortDate(task.dueDate)}
                                </p>
                              </div>
                              <TaskStatusBadge status={task.status} />
                            </div>
                            {task.status === "done" ? (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Approved by admin
                              </p>
                            ) : (
                              <div className="mt-2 flex flex-col gap-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {developerWorkStatuses.map((status) => (
                                    <Button
                                      key={status}
                                      size="xs"
                                      variant={
                                        task.status === status
                                          ? "secondary"
                                          : "outline"
                                      }
                                      onClick={() => {
                                        updateTaskStatus(task.id, status);
                                        toast.success("Task updated");
                                      }}
                                    >
                                      {status.replace("_", " ")}
                                    </Button>
                                  ))}
                                  {task.status !== "review" ? (
                                    <Button
                                      size="xs"
                                      onClick={() => setSubmitTask(task)}
                                    >
                                      Submit Work
                                    </Button>
                                  ) : null}
                                </div>
                                <TaskSubmissionHistory taskId={task.id} />
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {linkedTasks.length > myLinked.length ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      +{linkedTasks.length - myLinked.length} other team task
                      {linkedTasks.length - myLinked.length === 1 ? "" : "s"} on
                      this milestone
                    </p>
                  ) : null}
                </SectionCard>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ProjectGantt project={project} tasks={tasks.filter((t) => t.projectId === projectId)} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <SectionCard title="Your marketplace assignments" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {linkedAssignments.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {formatShortDate(a.deadline)} · {a.progress}% ·{" "}
                        {a.status.replace("_", " ")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/developer/tasks/${a.id}`} />}
                      nativeButton={false}
                    >
                      Open assignment
                    </Button>
                  </div>
                </li>
              ))}
              {linkedAssignments.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No assignments linked.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <SectionCard title="Project documents" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {projectDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · {doc.version} · {doc.uploadedBy}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.message("Download simulated", {
                        description: `${doc.name} — demo metadata only.`,
                      })
                    }
                  >
                    Download
                  </Button>
                </li>
              ))}
              {projectDocs.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No documents shared yet.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <SectionCard title="Project activity" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {feed.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                    {item.actorName ? ` · ${item.actorName}` : null}
                  </p>
                </li>
              ))}
              {feed.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No activity yet.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <TaskSubmitWorkDialog
        task={submitTask}
        open={Boolean(submitTask)}
        onOpenChange={(open) => {
          if (!open) setSubmitTask(null);
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
