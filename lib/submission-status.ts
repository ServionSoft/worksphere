import type { WorkSubmissionVersion } from "@/lib/portal-types";

export type SubmissionDisplayStatus =
  | "Draft"
  | "Submitted"
  | "Revision Requested"
  | "Internally Approved"
  | "Awaiting Client"
  | "Client Approved"
  | "Rejected";

export function submissionDisplayStatus(
  w: WorkSubmissionVersion
): SubmissionDisplayStatus {
  if (w.clientApprovalStatus === "approved") return "Client Approved";
  if (w.authorizedForClient && w.clientApprovalStatus === "pending") {
    return "Awaiting Client";
  }
  if (
    w.clientApprovalStatus === "revision_requested" ||
    (w.status === "rejected" && w.revisionNotes)
  ) {
    return "Revision Requested";
  }
  if (w.status === "approved") return "Internally Approved";
  if (w.status === "submitted" || w.status === "in_review") return "Submitted";
  if (w.status === "draft") return "Draft";
  if (w.status === "rejected") return "Rejected";
  return "Submitted";
}
