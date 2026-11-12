"use client";

import Link from "next/link";
import { BadgeCheck, CalendarDays, FileText, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { MilestoneStatusBadge } from "@/components/shared/milestone-badge";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatShortDate } from "@/lib/format";
import {
  clientDocuments,
  clientMilestones,
  clientPendingApprovals,
  clientProjects,
  productionStage,
} from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function ClientDashboard() {
  const { user } = useRequiredAuth();
  const {
    projects,
    milestones,
    documents,
    workSubmissions,
    threads,
    activity,
  } = useWorkspaceStore();

  const myProjects = clientProjects(projects, user);
  const ids = myProjects.map((p) => p.id);
  const myMilestones = clientMilestones(milestones, ids).slice(0, 4);
  const pending = clientPendingApprovals(workSubmissions, ids);
  const docs = clientDocuments(documents, ids).slice(0, 4);
  const clientThreads = threads.filter(
    (t) =>
      t.visibility === "client" &&
      (!t.projectId || ids.includes(t.projectId))
  );
  const feed = activity.filter((a) => a.projectId && ids.includes(a.projectId)).slice(0, 5);

  const kpis = [
    { label: "Total Projects", value: myProjects.length },
    {
      label: "Active Projects",
      value: myProjects.filter((p) => p.status === "active").length,
    },
    {
      label: "Completed",
      value: myProjects.filter((p) => p.status === "completed").length,
    },
    { label: "Pending Approvals", value: pending.length },
    {
      label: "Upcoming Deliveries",
      value: myMilestones.filter((m) => m.status !== "completed").length,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Track delivery, review milestones and approve work for your projects."
        actions={
          <div className="flex gap-2">
            <Button size="sm" render={<Link href="/client/approvals" />} nativeButton={false}>
              <BadgeCheck data-icon="inline-start" />
              Approvals
            </Button>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/client/projects" />}
              nativeButton={false}
            >
              <FolderKanban data-icon="inline-start" />
              Projects
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Project overview"
        description="Your assigned engagements"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/client/projects" />} nativeButton={false}>
            View all
          </Button>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {myProjects.map((project) => (
            <li key={project.id} className="px-5 py-3.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/client/projects/${project.id}`}
                    className="text-sm font-semibold hover:text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    PM {project.managerName} · {productionStage(project.progress)} · Due{" "}
                    {formatShortDate(project.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28">
                    <Progress value={project.progress} />
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Upcoming milestones" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {myMilestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <CalendarDays className="mr-1 inline size-3" />
                    {formatShortDate(m.dueDate)}
                  </p>
                </div>
                <MilestoneStatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Pending approvals" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {pending.map((item) => (
              <li key={item.id} className="px-5 py-3">
                <Link
                  href="/client/approvals"
                  className="text-sm font-medium hover:text-primary"
                >
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  v{item.version} · {item.submittedBy}
                </p>
              </li>
            ))}
            {pending.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                No approvals waiting.
              </li>
            ) : null}
          </ul>
        </SectionCard>

        <SectionCard title="Latest documents" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 px-5 py-3">
                <FileText className="size-3.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.version}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Recent messages" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {clientThreads.map((thread) => (
              <li key={thread.id} className="px-5 py-3">
                <Link
                  href="/client/messages"
                  className="text-sm font-medium hover:text-primary"
                >
                  {thread.subject}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {thread.projectName} · {thread.unreadCount} unread
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Recent activity" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {feed.map((item) => (
              <li key={item.id} className="px-5 py-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
