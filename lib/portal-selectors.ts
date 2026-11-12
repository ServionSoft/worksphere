import { clientProjectAccess } from "@/lib/mock-portals";
import type {
  Project,
  Milestone,
  ProjectDocument,
  Task,
  ActivityItem,
} from "@/lib/types";
import type {
  DeveloperAssignment,
  SessionUser,
  WorkSubmissionVersion,
} from "@/lib/portal-types";

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
      w.authorizedForClient &&
      w.clientApprovalStatus === "pending"
  );
}

export function developerAssignments(
  assignments: DeveloperAssignment[],
  user: SessionUser
) {
  if (!user.developerId) return [];
  return assignments.filter((a) => a.developerId === user.developerId);
}

export function developerProjectIds(
  assignments: DeveloperAssignment[],
  user: SessionUser
) {
  return Array.from(
    new Set(
      developerAssignments(assignments, user)
        .map((a) => a.projectId)
        .filter((id): id is string => Boolean(id))
    )
  );
}

export function developerProjects(
  projects: Project[],
  assignments: DeveloperAssignment[],
  user: SessionUser
) {
  const ids = developerProjectIds(assignments, user);
  return projects
    .filter((p) => ids.includes(p.id))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function developerProjectTasks(tasks: Task[], projectId: string) {
  return tasks
    .filter((t) => t.projectId === projectId && !t.parentId)
    .sort((a, b) => a.order - b.order);
}

export function developerMyTasks(
  tasks: Task[],
  projectId: string,
  user: SessionUser
) {
  const developerId = user.developerId;
  if (!developerId) return [];
  return developerProjectTasks(tasks, projectId).filter(
    (t) => t.assigneeId === developerId
  );
}

export function developerProjectMilestones(
  milestones: Milestone[],
  projectId: string
) {
  return milestones
    .filter((m) => m.projectId === projectId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function developerProjectDocuments(
  documents: ProjectDocument[],
  projectId: string
) {
  return documents.filter((d) => d.projectId === projectId);
}

export function developerProjectActivity(
  activity: ActivityItem[],
  projectId: string,
  limit = 12
) {
  return activity.filter((a) => a.projectId === projectId).slice(0, limit);
}

export function productionStage(progress: number) {
  if (progress >= 100) return "Completed";
  if (progress >= 75) return "Final delivery";
  if (progress >= 50) return "Build & QA";
  if (progress >= 25) return "Design & planning";
  return "Discovery";
}
