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

/** Parent tasks need client sign-off unless explicitly opted out. */
export function taskNeedsClientApproval(task: Task) {
  if (task.parentId) return false;
  return task.requiresClientApproval !== false;
}

/** Normalize legacy seed/persisted tasks to the client-approval gate. */
export function normalizeTaskClientGate(task: Task): Task {
  if (task.parentId) {
    return {
      ...task,
      requiresClientApproval: false,
      clientApprovalStatus: "not_required",
      authorizedForClient: false,
    };
  }
  if (task.requiresClientApproval === false) {
    return {
      ...task,
      clientApprovalStatus: task.clientApprovalStatus ?? "not_required",
    };
  }
  if (task.status === "done" && !task.clientApprovalStatus) {
    return {
      ...task,
      requiresClientApproval: true,
      authorizedForClient: true,
      clientApprovalStatus: "approved",
    };
  }
  return {
    ...task,
    requiresClientApproval: true,
    authorizedForClient: task.authorizedForClient ?? false,
    clientApprovalStatus: task.clientApprovalStatus ?? "not_required",
  };
}

export function clientProjects(projects: Project[], user: SessionUser) {
  if (!user.clientId) return [];
  // Demo seed map (c1 → p1/p6). API mode uses real UUIDs — match project.clientId.
  const mapped = clientProjectAccess[user.clientId];
  if (mapped) return projects.filter((p) => mapped.includes(p.id));
  return projects.filter((p) => p.clientId === user.clientId);
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

/** Client never sees Done until admin authorized + client approved. */
export function clientMilestoneDisplayStatus(
  milestone: Milestone,
  work: WorkSubmissionVersion[],
  tasks: Task[] = []
): Milestone["status"] {
  const linkedWork = work.filter(
    (w) => w.milestoneId === milestone.id && w.requiresClientApproval
  );
  const linkedTasks = tasks.filter(
    (t) =>
      t.milestoneId === milestone.id &&
      !t.parentId &&
      taskNeedsClientApproval(t)
  );
  const workApproved = linkedWork.some(
    (w) => w.clientApprovalStatus === "approved"
  );
  const tasksApproved =
    linkedTasks.length > 0 &&
    linkedTasks.every((t) => t.clientApprovalStatus === "approved");
  if (workApproved || tasksApproved) {
    return "completed";
  }
  const pendingClient =
    linkedWork.some(
      (w) => w.authorizedForClient && w.clientApprovalStatus === "pending"
    ) ||
    linkedTasks.some(
      (t) => t.authorizedForClient && t.clientApprovalStatus === "pending"
    );
  // Internal complete/missed must not leak as Done before client sign-off
  if (milestone.status === "completed" || milestone.status === "missed") {
    if (pendingClient) return "in_progress";
    return milestone.status === "missed" ? "missed" : "in_progress";
  }
  return milestone.status;
}

export function clientTaskDisplayLabel(task: Task): string {
  if (!taskNeedsClientApproval(task)) {
    if (task.status === "done") return "Done";
    if (task.status === "review") return "In review";
    if (task.status === "in_progress") return "In progress";
    if (task.status === "blocked") return "Blocked";
    return "Upcoming";
  }
  if (task.clientApprovalStatus === "approved") return "Done";
  if (
    task.authorizedForClient &&
    task.clientApprovalStatus === "pending"
  ) {
    return "Awaiting your approval";
  }
  if (task.clientApprovalStatus === "revision_requested") {
    return "Revisions requested";
  }
  if (task.clientApprovalStatus === "rejected") return "Rejected";
  if (task.status === "done" || task.status === "review") return "In review";
  if (task.status === "in_progress") return "In progress";
  if (task.status === "blocked") return "Blocked";
  return "Upcoming";
}

export function clientPendingTaskApprovals(
  tasks: Task[],
  projectIds: string[]
) {
  return tasks.filter(
    (t) =>
      !t.parentId &&
      projectIds.includes(t.projectId) &&
      taskNeedsClientApproval(t) &&
      t.authorizedForClient &&
      t.clientApprovalStatus === "pending"
  );
}

export function clientDeliverableDisplayLabel(
  work: WorkSubmissionVersion
): string {
  if (work.clientApprovalStatus === "approved") return "Done";
  if (work.clientApprovalStatus === "revision_requested") {
    return "Revisions requested";
  }
  if (work.clientApprovalStatus === "rejected") return "Rejected";
  if (work.authorizedForClient && work.clientApprovalStatus === "pending") {
    return "Awaiting your approval";
  }
  return "In review";
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
