"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/components/shared/section-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { MilestoneStatusBadge } from "@/components/shared/milestone-badge";
import { MilestoneReviewForm } from "@/components/client/milestone-review-form";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import {
  clientDeliverableDisplayLabel,
  clientMilestoneDisplayStatus,
  clientProjects,
  clientTaskDisplayLabel,
  productionStage,
} from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

export function ClientProjectDetail({ projectId }: { projectId: string }) {
  const { user, can } = useRequiredAuth();
  const {
    workspace,
    projects,
    tasks,
    milestones,
    documents,
    workSubmissions,
    threads,
    messages,
    activity,
    sendMessage,
  } = useWorkspaceStore();
  const [tab, setTab] = useState("overview");
  const [messageBody, setMessageBody] = useState("");

  const allowed = clientProjects(projects, user);
  const project = allowed.find((p) => p.id === projectId);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === projectId && !t.parentId),
    [tasks, projectId]
  );
  const projectMilestones = milestones.filter((m) => m.projectId === projectId);
  const projectDocs = documents.filter((d) => d.projectId === projectId);
  const approvals = workSubmissions.filter((w) => {
    if (w.projectId !== projectId || !w.requiresClientApproval) return false;
    const decided =
      w.clientApprovalStatus === "approved" ||
      w.clientApprovalStatus === "revision_requested" ||
      w.clientApprovalStatus === "rejected";
    return w.authorizedForClient || decided;
  });
  const thread = threads.find(
    (t) => t.projectId === projectId && t.visibility === "client"
  );
  const threadMessages = messages.filter(
    (m) => m.threadId === thread?.id && m.visibility === "client"
  );
  const feed = activity.filter((a) => a.projectId === projectId).slice(0, 8);

  if (!project) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
        <p className="font-semibold">Project unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You do not have access to this project.
        </p>
        <Button className="mt-4" render={<Link href="/client/projects" />} nativeButton={false}>
          Back to projects
        </Button>
      </div>
    );
  }

  const taskLabels = useMemo(
    () =>
      projectTasks.map((t) => ({
        task: t,
        label: clientTaskDisplayLabel(t),
      })),
    [projectTasks]
  );
  const completed = taskLabels.filter((t) => t.label === "Done").length;
  const inProgress = taskLabels.filter((t) =>
    ["In progress", "In review", "Awaiting your approval"].includes(t.label)
  ).length;
  const upcoming = taskLabels.filter((t) => t.label === "Upcoming").length;
  const delayed = projectTasks.filter((t) => {
    const label = clientTaskDisplayLabel(t);
    return label !== "Done" && t.dueDate < "2026-03-11";
  }).length;

  function postMessage() {
    if (!thread || !messageBody.trim()) return;
    sendMessage({
      threadId: thread.id,
      projectId,
      authorId: user.id,
      authorName: user.name,
      body: messageBody.trim(),
      visibility: "client",
    });
    setMessageBody("");
    toast.success("Message sent");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          render={<Link href="/client/projects" />}
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
          {can("edit_internal_budget")
            ? null
            : ` · Contract ${formatCurrency(project.budget, project.currency)}`}
        </p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="tabular-nums">{project.progress}%</span>
          </div>
          <Progress value={project.progress} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => typeof v === "string" && setTab(v)}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Production</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <SectionCard title="Project information">
            <p className="text-sm text-muted-foreground">{project.description}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Project manager" value={project.managerName} />
              <Info label="Production stage" value={productionStage(project.progress)} />
              <Info label="Start date" value={formatDate(project.startDate)} />
              <Info label="Expected delivery" value={formatDate(project.dueDate)} />
              <Info
                label="Contract value"
                value={formatCurrency(project.budget, project.currency)}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Internal notes, developer private data and confidential cost breakdowns are hidden in the client portal.
            </p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Completed tasks" value={completed} />
            <Stat label="In progress" value={inProgress} />
            <Stat label="Upcoming" value={upcoming} />
            <Stat label="Delayed" value={delayed} />
          </div>
          <SectionCard title="Task snapshot" className="mt-4" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {taskLabels.slice(0, 8).map(({ task, label }) => (
                <li
                  key={task.id}
                  className="flex justify-between gap-3 px-5 py-3 text-sm"
                >
                  <span>{task.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Done appears only after admin approval and your sign-off.
            </p>
          </SectionCard>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <div className="flex flex-col gap-3">
            {projectMilestones.map((m) => {
              const displayStatus = clientMilestoneDisplayStatus(
                m,
                workSubmissions,
                projectTasks
              );
              return (
                <div key={m.id} className="space-y-3">
                  <SectionCard
                    title={m.title}
                    description={`Due ${formatDate(m.dueDate)}${
                      m.clientPrice != null
                        ? ` · ${formatCurrency(m.clientPrice, m.currency ?? "USD")}`
                        : ""
                    }`}
                    action={<MilestoneStatusBadge status={displayStatus} />}
                  >
                    <p className="text-sm text-muted-foreground">
                      {m.publicDescription || m.description}
                    </p>
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {m.deliverables.map((d) => (
                        <li
                          key={d}
                          className="rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {displayStatus === "completed"
                        ? "Marked Done after your approval."
                        : "Done only after admin sends it for review and you approve."}
                    </p>
                  </SectionCard>
                  <MilestoneReviewForm
                    milestoneId={m.id}
                    milestoneTitle={m.title}
                    enabled={m.status === "completed"}
                  />
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="deliverables" className="mt-4">
          <SectionCard title="Deliverables" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {approvals.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    v{item.version} · {clientDeliverableDisplayLabel(item)} ·{" "}
                    {formatShortDate(item.submittedAt)}
                  </p>
                </li>
              ))}
              {approvals.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No deliverables ready for you yet. Admin must approve first.
                </li>
              ) : null}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <Button render={<Link href="/client/approvals" />} nativeButton={false}>
            Open Approval Center
          </Button>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <SectionCard title="Documents" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {projectDocs.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · {doc.version}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void (async () => {
                        try {
                          const { openDocumentDownload } = await import(
                            "@/lib/supabase/document-storage"
                          );
                          await openDocumentDownload(workspace.id, doc.id);
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Download failed"
                          );
                        }
                      })();
                    }}
                  >
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <SectionCard title={thread?.subject ?? "Project messages"}>
            <div className="flex flex-col gap-3">
              {threadMessages.map((m) => (
                <div key={m.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="text-xs font-medium">
                    {m.authorName}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {formatShortDate(m.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
                </div>
              ))}
              <textarea
                className="min-h-20 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write a client-visible message..."
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={postMessage} disabled={!thread}>
                  Send
                </Button>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <SectionCard title="Activity" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {feed.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>
      </Tabs>
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
