"use client";

import { useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { SubmissionDeliverables } from "@/components/shared/submission-deliverables";
import { SubmissionStatusBadge } from "@/components/shared/milestone-badge";
import { PendingDeveloperRatings } from "@/components/admin/pending-developer-ratings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { approveApiMilestoneDelivery } from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { formatRelativeTime, formatShortDate } from "@/lib/format";
import { submissionDisplayStatus } from "@/lib/submission-status";
import type { Submission, SubmissionStatus, Task } from "@/lib/types";
import type { WorkSubmissionVersion } from "@/lib/portal-types";
import { useWorkspaceStore } from "@/lib/workspace-store";

type Filter = "needs_review" | "in_review" | "approved" | "rejected" | "all";

type UnifiedItem =
  | {
      kind: "work";
      id: string;
      title: string;
      description: string;
      status: SubmissionStatus;
      submittedBy: string;
      submittedAt: string;
      version?: number;
      reviewerName?: string;
      reviewNote?: string;
      authorizedForClient: boolean;
      projectId?: string;
      work: WorkSubmissionVersion;
    }
  | {
      kind: "submission";
      id: string;
      title: string;
      description: string;
      status: SubmissionStatus;
      submittedBy: string;
      submittedAt: string;
      version?: number;
      reviewerName?: string;
      reviewNote?: string;
      authorizedForClient: boolean;
      projectId?: string;
      submission: Submission;
    }
  | {
      kind: "task";
      id: string;
      title: string;
      description: string;
      status: SubmissionStatus;
      submittedBy: string;
      submittedAt: string;
      version?: number;
      reviewerName?: string;
      reviewNote?: string;
      authorizedForClient: boolean;
      projectId?: string;
      task: Task;
    };

export function ApprovalsCenter() {
  const {
    workSubmissions,
    submissions,
    projects,
    tasks,
    milestones,
    assignments,
    workspace,
    setWorkspaceId,
    reviewWorkSubmission,
    authorizeClientReview,
    authorizeSubmissionForClient,
    authorizeTaskForClient,
    updateSubmissionStatus,
    updateTaskStatus,
  } = useWorkspaceStore();

  const [filter, setFilter] = useState<Filter>("needs_review");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [deliveryBusyId, setDeliveryBusyId] = useState<string | null>(null);

  const items = useMemo(() => {
    const workItems: UnifiedItem[] = workSubmissions.map((w) => ({
      kind: "work",
      id: w.id,
      title: w.title,
      description: w.description,
      status: w.status,
      submittedBy: w.submittedBy,
      submittedAt: w.submittedAt,
      version: w.version,
      reviewerName: w.internalReviewerName,
      reviewNote: w.internalReviewNote ?? w.revisionNotes,
      authorizedForClient: w.authorizedForClient,
      projectId: w.projectId,
      work: w,
    }));

    const submissionItems: UnifiedItem[] = submissions
      .filter((s) => !s.workSubmissionId)
      .map((s) => ({
        kind: "submission" as const,
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        submittedBy: s.submittedBy,
        submittedAt: s.submittedAt,
        reviewerName: s.reviewerName,
        reviewNote: s.reviewNote,
        authorizedForClient: Boolean(s.authorizedForClient),
        projectId: s.projectId,
        submission: s,
      }));

    // Legacy task-status-only items: only when no versioned submission exists yet
    const submittedTaskIds = new Set(
      workSubmissions.map((w) => w.taskId).filter(Boolean)
    );
    const taskItems: UnifiedItem[] = tasks
      .filter(
        (t) =>
          !t.parentId &&
          !submittedTaskIds.has(t.id) &&
          (t.status === "review" ||
            t.clientApprovalStatus === "revision_requested" ||
            (t.authorizedForClient && t.clientApprovalStatus === "pending"))
      )
      .map((t) => {
        let status: SubmissionStatus = "submitted";
        if (t.clientApprovalStatus === "revision_requested") status = "rejected";
        else if (t.authorizedForClient && t.clientApprovalStatus === "pending")
          status = "approved";
        return {
          kind: "task" as const,
          id: t.id,
          title: t.title,
          description: t.description || `Assigned to ${t.assigneeName}`,
          status,
          submittedBy: t.assigneeName,
          submittedAt: t.dueDate,
          authorizedForClient: Boolean(t.authorizedForClient),
          projectId: t.projectId,
          task: t,
        };
      });

    const combined = [...workItems, ...submissionItems, ...taskItems].sort(
      (a, b) => b.submittedAt.localeCompare(a.submittedAt)
    );

    return combined.filter((item) => {
      if (filter === "all") return true;
      if (filter === "needs_review") {
        return item.status === "submitted" || item.status === "in_review";
      }
      if (filter === "in_review") return item.status === "in_review";
      if (filter === "approved") return item.status === "approved";
      if (filter === "rejected") return item.status === "rejected";
      return true;
    });
  }, [workSubmissions, submissions, tasks, filter]);

  function canAct(status: SubmissionStatus) {
    return status === "submitted" || status === "in_review" || status === "draft";
  }

  function markInReview(item: UnifiedItem) {
    if (item.kind === "task") {
      toast.success("Task already awaiting review", { description: item.title });
      return;
    }
    if (item.kind === "work") {
      reviewWorkSubmission(item.id, "in_review", notes[item.id]);
    } else {
      updateSubmissionStatus(item.id, "in_review", notes[item.id]);
    }
    toast.success("Marked in review", { description: item.title });
  }

  function approve(item: UnifiedItem) {
    if (item.kind === "task") {
      authorizeTaskForClient(item.id);
      toast.success("Approved & authorized for client", {
        description: item.title,
      });
      return;
    }
    if (item.kind === "work") {
      reviewWorkSubmission(item.id, "approved", notes[item.id]);
    } else {
      updateSubmissionStatus(item.id, "approved", notes[item.id]);
    }
    toast.success("Approved", { description: item.title });
  }

  function requestRevision(item: UnifiedItem) {
    const note = notes[item.id]?.trim();
    if (!note) {
      toast.error("Add revision notes before requesting changes");
      return;
    }
    if (item.kind === "task") {
      updateTaskStatus(item.id, "in_progress");
      toast.success("Revision requested", { description: item.title });
      return;
    }
    if (item.kind === "work") {
      reviewWorkSubmission(item.id, "rejected", note);
    } else {
      updateSubmissionStatus(item.id, "rejected", note);
    }
    toast.success("Revision requested", { description: item.title });
  }

  function authorizeClient(item: UnifiedItem) {
    if (item.kind === "task") {
      authorizeTaskForClient(item.id);
      toast.success("Authorized for client review", {
        description: item.title,
      });
      return;
    }
    if (item.status !== "approved") {
      toast.error("Approve internally before authorizing the client");
      return;
    }
    if (item.kind === "work") {
      authorizeClientReview(item.id, notes[item.id]);
      toast.success("Authorized for client review", {
        description: item.title,
      });
      return;
    }
    authorizeSubmissionForClient(item.id, notes[item.id]);
    toast.success("Authorized for client review", { description: item.title });
  }

  function resolveMilestoneId(item: UnifiedItem): string | null {
    if (item.kind !== "work") return null;
    if (item.work.milestoneId) return item.work.milestoneId;
    if (item.work.assignmentId) {
      const a = assignments.find((x) => x.id === item.work.assignmentId);
      if (a?.milestoneId) return a.milestoneId;
    }
    return null;
  }

  async function approveDelivery(item: UnifiedItem) {
    if (item.kind !== "work" || item.status !== "approved") {
      toast.error("Internally approve the submission before delivery approval");
      return;
    }
    const milestoneId = resolveMilestoneId(item);
    if (!milestoneId || !workspace?.id || !isApiDataSource()) {
      toast.error("Delivery approval requires a milestone-linked API submission");
      return;
    }
    const ms = milestones.find((m) => m.id === milestoneId);
    if (ms?.deliveryApprovedAt) {
      toast.message("Delivery already approved for this milestone");
      return;
    }
    setDeliveryBusyId(item.id);
    try {
      const result = await approveApiMilestoneDelivery(workspace.id, milestoneId, {
        submissionId: item.id,
        note: notes[item.id],
      });
      toast.success("Delivery approved — payout clearance started", {
        description: `${result.clearanceDays} calendar day(s) until eligible`,
      });
      setWorkspaceId(workspace.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve delivery failed");
    } finally {
      setDeliveryBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Approvals"
        description="Internal review of work submissions, deliverables, and client developer ratings."
      />

      <PendingDeveloperRatings />

      <Tabs
        value={filter}
        onValueChange={(v) => typeof v === "string" && setFilter(v as Filter)}
      >
        <TabsList>
          <TabsTrigger value="needs_review">Needs review</TabsTrigger>
          <TabsTrigger value="in_review">In review</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const project = projects.find((p) => p.id === item.projectId);
          return (
            <SectionCard
              key={`${item.kind}-${item.id}`}
              title={item.title}
              description={`${project?.name ?? "Project"} · ${item.submittedBy} · ${formatRelativeTime(item.submittedAt)}`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {item.version != null ? (
                    <Badge variant="secondary">v{item.version}</Badge>
                  ) : null}
                  <Badge variant="outline">
                    {item.kind === "work"
                      ? item.work.taskId
                        ? "Direct task"
                        : "Marketplace"
                      : item.kind === "task"
                        ? "Direct task (legacy)"
                        : "Submission"}
                  </Badge>
                  {item.kind === "work" ? (
                    <Badge variant="secondary">
                      {submissionDisplayStatus(item.work)}
                    </Badge>
                  ) : null}
                  <SubmissionStatusBadge status={item.status} />
                </div>
              }
            >
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>
                  Reviewer:{" "}
                  <span className="text-foreground">
                    {item.reviewerName ?? "—"}
                  </span>
                </p>
                <p>
                  Client authorized:{" "}
                  <span className="text-foreground">
                    {item.authorizedForClient ? "Yes" : "No"}
                  </span>
                </p>
                {item.kind === "work" ? (
                  <>
                    <p>Submitted {formatShortDate(item.submittedAt)}</p>
                    <p>
                      Client approval:{" "}
                      {item.work.clientApprovalStatus.replaceAll("_", " ")}
                    </p>
                  </>
                ) : null}
              </div>

              <p className="mt-3 text-sm">{item.description}</p>
              {item.kind === "work" ? (
                <SubmissionDeliverables
                  files={item.work.files}
                  repoUrl={item.work.repoUrl}
                  deployUrl={item.work.deployUrl}
                  designUrl={item.work.designUrl}
                  testingNotes={item.work.testingNotes}
                />
              ) : null}

              {item.reviewNote ? (
                <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Notes: {item.reviewNote}
                  {item.reviewerName ? ` — ${item.reviewerName}` : ""}
                </p>
              ) : null}

              {canAct(item.status) ||
              (item.status === "approved" && !item.authorizedForClient) ||
              (item.kind === "work" &&
                item.status === "approved" &&
                Boolean(resolveMilestoneId(item))) ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Textarea
                    placeholder="Review notes / revision comments..."
                    value={notes[item.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="min-h-16"
                  />
                  <div className="flex flex-wrap gap-2">
                    {canAct(item.status) ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markInReview(item)}
                        >
                          Mark in review
                        </Button>
                        <Button size="sm" onClick={() => approve(item)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => requestRevision(item)}
                        >
                          Request revision
                        </Button>
                      </>
                    ) : null}
                    {item.status === "approved" &&
                    !item.authorizedForClient ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => authorizeClient(item)}
                      >
                        <ShieldCheck className="size-3.5" />
                        Authorize for client
                      </Button>
                    ) : null}
                    {item.kind === "work" &&
                    item.status === "approved" &&
                    resolveMilestoneId(item) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deliveryBusyId === item.id}
                        onClick={() => void approveDelivery(item)}
                      >
                        {deliveryBusyId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : null}
                        Approve delivery
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </SectionCard>
          );
        })}

        {items.length === 0 ? (
          <SectionCard title="No items">
            <p className="text-sm text-muted-foreground">
              Nothing matches this filter.
            </p>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
