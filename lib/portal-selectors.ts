import { clientProjectAccess } from "@/lib/mock-portals";
import type { Project, Milestone, ProjectDocument } from "@/lib/types";
import type { SessionUser, WorkSubmissionVersion } from "@/lib/portal-types";

export function clientProjects(projects: Project[], user: SessionUser) {
  const ids = user.clientId ? clientProjectAccess[user.clientId] ?? [] : [];
  return projects.filter((p) => ids.includes(p.id));
}

export function clientMilestones(
  milestones: Milestone[],
  projectIds: string[]
) {
  return milestones.filter((m) => projectIds.includes(m.projectId));
}

export function clientDocuments(
  documents: ProjectDocument[],
  projectIds: string[]
) {
  return documents.filter((d) => projectIds.includes(d.projectId));
}

export function clientPendingApprovals(
  work: WorkSubmissionVersion[],
  projectIds: string[]
) {
  return work.filter(
    (w) =>
      w.projectId &&
      projectIds.includes(w.projectId) &&
      w.requiresClientApproval &&
      w.clientApprovalStatus === "pending"
  );
}

export function productionStage(progress: number) {
  if (progress >= 100) return "Completed";
  if (progress >= 75) return "Final delivery";
  if (progress >= 50) return "Build & QA";
  if (progress >= 25) return "Design & planning";
  return "Discovery";
}
