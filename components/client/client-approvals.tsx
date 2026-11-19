"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SubmissionStatusBadge } from "@/components/shared/milestone-badge";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatShortDate } from "@/lib/format";
import {
  clientPendingApprovals,
  clientPendingTaskApprovals,
  clientProjects,
  taskNeedsClientApproval,
} from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ClientApprovalStatus } from "@/lib/portal-types";
import type { TaskClientApprovalStatus } from "@/lib/types";
import { toast } from "sonner";

type Filter = "pending" | "approved" | "rejected" | "revision_requested" | "all";

export function ClientApprovalsPage() {
  const { user, can } = useRequiredAuth();
  const {
    projects,
    milestones,
    tasks,
    workSubmissions,
    clientReviewWork,
    clientReviewTask,
  } = useWorkspaceStore();
  const [filter, setFilter] = useState<Filter>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const myProjects = clientProjects(projects, user);
  const ids = myProjects.map((p) => p.id);

  const deliverables = useMemo(() => {
    return workSubmissions.filter((w) => {
      if (!w.projectId || !ids.includes(w.projectId)) return false;
      if (!w.requiresClientApproval) return false;
      const decided =
        w.clientApprovalStatus === "approved" ||
        w.clientApprovalStatus === "revision_requested" ||
        w.clientApprovalStatus === "rejected";
      if (!w.authorizedForClient && !decided) return false;
      if (filter === "all") return true;
      return w.clientApprovalStatus === filter;
    });
  }, [workSubmissions, ids, filter]);

  const taskItems = useMemo(() => {
    return tasks.filter((t) => {
      if (t.parentId || !ids.includes(t.projectId)) return false;
      if (!taskNeedsClientApproval(t)) return false;
      const decided =
        t.clientApprovalStatus === "approved" ||
        t.clientApprovalStatus === "revision_requested" ||
        t.clientApprovalStatus === "rejected";
      if (!t.authorizedForClient && !decided) return false;
      if (filter === "all") return true;
      return t.clientApprovalStatus === filter;
    });
  }, [tasks, ids, filter]);

  function decideDeliverable(
    id: string,
    decision: Extract<
      ClientApprovalStatus,
      "approved" | "revision_requested" | "rejected"
    >,
    title: string
  ) {
    if (!can("approve_client_deliverable")) {
      toast.error("You cannot approve deliverables in this role");
      return;
    }
    clientReviewWork(id, decision, notes[id]);
    toast.success(`Marked ${decision.replace("_", " ")}`, { description: title });
  }

  function decideTask(
    id: string,
    decision: Extract<
      TaskClientApprovalStatus,
      "approved" | "revision_requested" | "rejected"
    >,
    title: string
  ) {
    if (!can("approve_client_deliverable")) {
      toast.error("You cannot approve tasks in this role");
      return;
    }
    clientReviewTask(id, decision, notes[id]);
    toast.success(
      decision === "approved" ? "Task marked Done" : `Marked ${decision.replace("_", " ")}`,
      { description: title }
    );
  }

  const empty =
    deliverables.length === 0 &&
    taskItems.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Approval Center"
        description="Tasks and deliverables: admin approves first, then you sign off. Done only after your approval."
      />

      <Tabs
        value={filter}
        onValueChange={(v) => typeof v === "string" && setFilter(v as Filter)}
      >
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="revision_requested">Revisions</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3">
        {taskItems.map((item) => {
          const project = projects.find((p) => p.id === item.projectId);
          const milestone = milestones.find((m) => m.id === item.milestoneId);
          return (
            <SectionCard
              key={item.id}
              title={item.title}
              description={`${project?.name ?? "Project"} · Task · ${milestone?.title ?? "No milestone"}`}
              action={
                <SubmissionStatusBadge
                  status={
                    item.clientApprovalStatus === "approved"
                      ? "approved"
                      : item.clientApprovalStatus === "rejected"
                        ? "rejected"
                        : item.clientApprovalStatus === "revision_requested"
                          ? "rejected"
                          : "in_review"
                  }
                />
              }
            >
              {item.clientApprovalStatus === "approved" ? (
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  Done — signed off by you after admin approval.
                </p>
              ) : null}
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Assignee {item.assigneeName}</p>
                <p>Due {formatShortDate(item.dueDate)}</p>
                <p>PM {project?.managerName ?? "—"}</p>
                <p>
                  Milestone{" "}
                  {milestone ? formatShortDate(milestone.dueDate) : "—"}
                </p>
              </div>
              <p className="mt-3 text-sm">{item.description}</p>

              {item.clientApprovalStatus === "pending" ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Textarea
                    placeholder="Comments / revision notes (required for reject or revise)"
                    value={notes[item.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => decideTask(item.id, "approved", item.title)}
                    >
                      Approve → Done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!notes[item.id]?.trim()) {
                          toast.error("Add revision comments");
                          return;
                        }
                        decideTask(item.id, "revision_requested", item.title);
                      }}
                    >
                      Request revisions
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!notes[item.id]?.trim()) {
                          toast.error("Add rejection explanation");
                          return;
                        }
                        decideTask(item.id, "rejected", item.title);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : null}
            </SectionCard>
          );
        })}

        {deliverables.map((item) => {
          const project = projects.find((p) => p.id === item.projectId);
          const milestone = milestones.find((m) => m.id === item.milestoneId);
          return (
            <SectionCard
              key={item.id}
              title={item.title}
              description={`${project?.name ?? "Project"} · Deliverable · ${milestone?.title ?? "Milestone"} · v${item.version}`}
              action={
                <SubmissionStatusBadge
                  status={
                    item.clientApprovalStatus === "approved"
                      ? "approved"
                      : item.clientApprovalStatus === "rejected"
                        ? "rejected"
                        : item.clientApprovalStatus === "revision_requested"
                          ? "rejected"
                          : "in_review"
                  }
                />
              }
            >
              {item.clientApprovalStatus === "approved" ? (
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  Done — signed off by you after admin approval.
                </p>
              ) : null}
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Submitted by {item.submittedBy}</p>
                <p>Submitted {formatShortDate(item.submittedAt)}</p>
                <p>PM {project?.managerName ?? "—"}</p>
                <p>
                  Deadline {milestone ? formatShortDate(milestone.dueDate) : "—"}
                </p>
              </div>
              <p className="mt-3 text-sm">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.files.map((file) => (
                  <Button
                    key={file}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.message("File download unavailable", {
                        description: `${file} — signed Storage URL not configured`,
                      })
                    }
                  >
                    {file}
                  </Button>
                ))}
                {item.repoUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.message(item.repoUrl!)}
                  >
                    Repository
                  </Button>
                ) : null}
              </div>

              {item.clientApprovalStatus === "pending" ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Textarea
                    placeholder="Comments / revision notes (required for reject or revise)"
                    value={notes[item.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        decideDeliverable(item.id, "approved", item.title)
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!notes[item.id]?.trim()) {
                          toast.error("Add revision comments");
                          return;
                        }
                        decideDeliverable(
                          item.id,
                          "revision_requested",
                          item.title
                        );
                      }}
                    >
                      Request revisions
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!notes[item.id]?.trim()) {
                          toast.error("Add rejection explanation");
                          return;
                        }
                        decideDeliverable(item.id, "rejected", item.title);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : item.revisionNotes ? (
                <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
                  Review note: {item.revisionNotes}
                </p>
              ) : null}
            </SectionCard>
          );
        })}

        {empty ? (
          <SectionCard title="No items">
            <p className="text-sm text-muted-foreground">
              {filter === "pending"
                ? clientPendingApprovals(workSubmissions, ids).length === 0 &&
                  clientPendingTaskApprovals(tasks, ids).length === 0
                  ? "Nothing waiting for your approval."
                  : "No matching items."
                : "No matching approval records."}
            </p>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
