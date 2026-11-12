"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/shared/section-card";
import {
  SubmissionStatusBadge,
  submissionLabels,
} from "@/components/shared/milestone-badge";
import { formatRelativeTime } from "@/lib/format";
import { currentUser } from "@/lib/mock-data";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { SubmissionStatus } from "@/lib/types";
import { toast } from "sonner";

interface ProjectApprovalsProps {
  projectId: string;
}

export function ProjectApprovals({ projectId }: ProjectApprovalsProps) {
  const { submissions, updateSubmissionStatus, addSubmission } =
    useWorkspaceStore();
  const items = submissions.filter((s) => s.projectId === projectId);
  const [notes, setNotes] = useState<Record<string, string>>({});

  function review(id: string, status: "approved" | "rejected", title: string) {
    updateSubmissionStatus(id, status, notes[id] || undefined);
    toast.success(`Submission ${status}`, { description: title });
  }

  function createSubmission() {
    addSubmission({
      projectId,
      title: "New deliverable submission",
      description: "Ready for internal review.",
      submittedBy: currentUser.name,
      status: "submitted",
      documentIds: [],
    });
    toast.success("Submission created");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={createSubmission}>
          New submission
        </Button>
      </div>

      {items.map((item) => (
        <SectionCard
          key={item.id}
          title={item.title}
          description={`Submitted by ${item.submittedBy} · ${formatRelativeTime(item.submittedAt)}`}
          action={<SubmissionStatusBadge status={item.status} />}
        >
          <p className="text-sm text-muted-foreground">{item.description}</p>

          {item.reviewNote ? (
            <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Review note: {item.reviewNote}
              {item.reviewerName ? ` — ${item.reviewerName}` : ""}
            </p>
          ) : null}

          {canReview(item.status) ? (
            <div className="mt-4 flex flex-col gap-2">
              <Textarea
                placeholder="Optional review note..."
                value={notes[item.id] ?? ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                className="min-h-16"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateSubmissionStatus(item.id, "in_review")
                  }
                >
                  Mark in review
                </Button>
                <Button
                  size="sm"
                  onClick={() => review(item.id, "approved", item.title)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => review(item.id, "rejected", item.title)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Status: {submissionLabels[item.status]}
            </p>
          )}
        </SectionCard>
      ))}

      {items.length === 0 ? (
        <SectionCard title="Approvals" description="No submissions yet">
          <p className="text-sm text-muted-foreground">
            Create a submission to start the approval workflow.
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}

function canReview(status: SubmissionStatus) {
  return status === "submitted" || status === "in_review" || status === "draft";
}
