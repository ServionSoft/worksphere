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
import { clientPendingApprovals, clientProjects } from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ClientApprovalStatus } from "@/lib/portal-types";
import { toast } from "sonner";

type Filter = "pending" | "approved" | "rejected" | "revision_requested" | "all";

export function ClientApprovalsPage() {
  const { user, can } = useRequiredAuth();
  const {
    projects,
    milestones,
    workSubmissions,
    clientReviewWork,
  } = useWorkspaceStore();
  const [filter, setFilter] = useState<Filter>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const myProjects = clientProjects(projects, user);
  const ids = myProjects.map((p) => p.id);

  const items = useMemo(() => {
    return workSubmissions.filter((w) => {
      if (!w.projectId || !ids.includes(w.projectId)) return false;
      if (!w.requiresClientApproval) return false;
      const decided =
        w.clientApprovalStatus === "approved" ||
        w.clientApprovalStatus === "revision_requested" ||
        w.clientApprovalStatus === "rejected";
      // Pending items require explicit authorization; history stays visible after revoke.
      if (!w.authorizedForClient && !decided) return false;
      if (filter === "all") return true;
      return w.clientApprovalStatus === filter;
    });
  }, [workSubmissions, ids, filter]);

  function decide(
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Approval Center"
        description="Review submissions after internal QA. Approvals are never automatic."
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
        {items.map((item) => {
          const project = projects.find((p) => p.id === item.projectId);
          const milestone = milestones.find((m) => m.id === item.milestoneId);
          return (
            <SectionCard
              key={item.id}
              title={item.title}
              description={`${project?.name ?? "Project"} · ${milestone?.title ?? "Milestone"} · v${item.version}`}
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
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Submitted by {item.submittedBy}</p>
                <p>Submitted {formatShortDate(item.submittedAt)}</p>
                <p>PM {project?.managerName ?? "—"}</p>
                <p>Deadline {milestone ? formatShortDate(milestone.dueDate) : "—"}</p>
              </div>
              <p className="mt-3 text-sm">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.files.map((file) => (
                  <Button
                    key={file}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast.message("File download simulated", {
                        description: `${file} — local metadata only`,
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
                      onClick={() => decide(item.id, "approved", item.title)}
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
                        decide(item.id, "revision_requested", item.title);
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
                        decide(item.id, "rejected", item.title);
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
        {items.length === 0 ? (
          <SectionCard title="No items">
            <p className="text-sm text-muted-foreground">
              {filter === "pending"
                ? clientPendingApprovals(workSubmissions, ids).length === 0
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
