import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MilestoneStatus, SubmissionStatus } from "@/lib/types";

const milestoneStyles: Record<MilestoneStatus, string> = {
  upcoming: "bg-sky-50 text-sky-700 border-sky-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  missed: "bg-red-50 text-red-700 border-red-200",
};

const milestoneLabels: Record<MilestoneStatus, string> = {
  upcoming: "Upcoming",
  in_progress: "In Progress",
  completed: "Completed",
  missed: "Missed",
};

const submissionStyles: Record<SubmissionStatus, string> = {
  draft: "bg-slate-50 text-slate-700 border-slate-200",
  submitted: "bg-sky-50 text-sky-700 border-sky-200",
  in_review: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const submissionLabels: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", milestoneStyles[status])}
    >
      {milestoneLabels[status]}
    </Badge>
  );
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", submissionStyles[status])}
    >
      {submissionLabels[status]}
    </Badge>
  );
}

export { milestoneLabels, submissionLabels };
