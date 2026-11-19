import { apiFetch, setApiWorkspaceId } from "@/lib/api/client";
import { fetchMyWorkspaces } from "@/lib/api/auth";
import type {
  ActivityItem,
  Client,
  Milestone,
  MilestoneStatus,
  Project,
  ProjectComment,
  ProjectDocument,
  Submission,
  SubmissionStatus,
  Task,
  TaskClientApprovalStatus,
  TaskStatus,
  TeamMember,
  Workspace,
} from "@/lib/types";
import type {
  DeveloperAssignment,
  DeveloperProfile,
  DeveloperStatus,
  EarningRecord,
  Invoice,
  MarketplaceOpportunity,
  MessageThread,
  MessagingRecipient,
  OpportunityStatus,
  PortalMessage,
  PortalNotification,
  Quotation,
  QuotationStatus,
  WorkSubmissionVersion,
} from "@/lib/portal-types";

export interface WorkspaceBootstrap {
  workspace: Workspace;
  clients: Client[];
  team: TeamMember[];
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  documents: ProjectDocument[];
  comments: ProjectComment[];
  submissions: Submission[];
  activity: ActivityItem[];
  opportunities: MarketplaceOpportunity[];
  quotations: Quotation[];
  assignments: DeveloperAssignment[];
  workSubmissions: WorkSubmissionVersion[];
  threads: MessageThread[];
  messages: PortalMessage[];
  invoices: Invoice[];
  earnings: EarningRecord[];
  portalNotifications: PortalNotification[];
  developers: DeveloperProfile[];
  savedOpportunityIds: string[];
}

export async function loadWorkspaceBootstrap(workspaceId: string) {
  setApiWorkspaceId(workspaceId);
  return apiFetch<WorkspaceBootstrap>(
    `/api/workspaces/${workspaceId}/bootstrap`,
    { workspaceId }
  );
}

export async function listApiWorkspaces(): Promise<Workspace[]> {
  const rows = await fetchMyWorkspaces();
  return rows.map((w) => ({
    id: w.id,
    name: w.name,
    plan: w.plan,
    color: w.color ?? "",
    companyName: w.companyName ?? undefined,
    seats: w.seats,
    status: (w.status as Workspace["status"]) ?? "active",
  }));
}

export function createApiWorkspace(input: {
  name: string;
  companyName?: string;
  plan?: string;
  color?: string;
  seats?: number;
}) {
  return apiFetch<Workspace>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      companyName: input.companyName,
      plan: input.plan,
      color: input.color,
      seats: input.seats,
    }),
  });
}

export function patchApiWorkspace(
  workspaceId: string,
  patch: Partial<{
    name: string;
    companyName: string;
    plan: string;
    color: string;
    seats: number;
    status: string;
  }>
) {
  return apiFetch<Workspace>(`/api/workspaces/${workspaceId}`, {
    method: "PATCH",
    workspaceId,
    body: JSON.stringify(patch),
  });
}

export function inviteApiMember(
  workspaceId: string,
  input: {
    email: string;
    fullName: string;
    role: "tenant_admin" | "project_manager" | "internal_member";
  }
) {
  return apiFetch<TeamMember & { inviteActionLink?: string }>(
    `/api/workspaces/${workspaceId}/members/invite`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(input),
    }
  );
}

export function patchApiMember(
  workspaceId: string,
  memberId: string,
  patch: { role?: string; active?: boolean }
) {
  return apiFetch<TeamMember>(
    `/api/workspaces/${workspaceId}/members/${memberId}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify(patch),
    }
  );
}

export type ChangeOrder = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  assignmentId: string | null;
  title: string;
  reason: string;
  status: string;
  previousBudget: number | null;
  newBudget: number | null;
  previousDeadline: string | null;
  newDeadline: string | null;
  scopeDelta: string;
  createdAt: string;
};

export function listApiChangeOrders(workspaceId: string) {
  return apiFetch<ChangeOrder[]>(
    `/api/workspaces/${workspaceId}/change-orders`,
    { workspaceId }
  );
}

export function createApiChangeOrder(
  workspaceId: string,
  input: {
    title: string;
    reason?: string;
    projectId?: string | null;
    assignmentId?: string | null;
    newBudget?: number | null;
    newDeadline?: string | null;
    scopeDelta?: string;
  }
) {
  return apiFetch<ChangeOrder>(
    `/api/workspaces/${workspaceId}/change-orders`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(input),
    }
  );
}

export function resolveApiChangeOrder(
  workspaceId: string,
  changeOrderId: string,
  decision: "approved" | "rejected"
) {
  return apiFetch<ChangeOrder>(
    `/api/workspaces/${workspaceId}/change-orders/${changeOrderId}/resolve`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ decision }),
    }
  );
}

export function createApiClient(
  workspaceId: string,
  client: Omit<Client, "id"> & { id?: string; inviteToPortal?: boolean }
) {
  return apiFetch<Client>(`/api/workspaces/${workspaceId}/clients`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify({
      name: client.name,
      industry: client.industry,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      status: client.status,
      notes: client.notes,
      inviteToPortal: client.inviteToPortal === true,
    }),
  });
}

export function inviteApiClient(
  workspaceId: string,
  clientId: string,
  email?: string
) {
  return apiFetch<Client>(
    `/api/workspaces/${workspaceId}/clients/${clientId}/invite`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(email ? { email } : {}),
    }
  );
}

export function patchApiClient(
  workspaceId: string,
  clientId: string,
  patch: Partial<Client>
) {
  return apiFetch<Client>(`/api/workspaces/${workspaceId}/clients/${clientId}`, {
    method: "PATCH",
    workspaceId,
    body: JSON.stringify({
      name: patch.name,
      industry: patch.industry,
      contactName: patch.contactName,
      email: patch.email,
      phone: patch.phone,
      status: patch.status,
      notes: patch.notes,
    }),
  });
}

export function createApiProject(workspaceId: string, project: Project) {
  return apiFetch<Project>(`/api/workspaces/${workspaceId}/projects`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify({
      name: project.name,
      description: project.description,
      clientId: project.clientId,
      managerProfileId: project.managerId || undefined,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate || undefined,
      dueDate: project.dueDate || undefined,
      teamSize: project.teamSize,
      budget: project.budget,
      spent: project.spent,
      currency: project.currency,
    }),
  });
}

export function patchApiProject(
  workspaceId: string,
  projectId: string,
  patch: Partial<Project>
) {
  return apiFetch<Project>(
    `/api/workspaces/${workspaceId}/projects/${projectId}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify({
        name: patch.name,
        description: patch.description,
        clientId: patch.clientId,
        managerProfileId: patch.managerId,
        status: patch.status,
        progress: patch.progress,
        priority: patch.priority,
        startDate: patch.startDate,
        dueDate: patch.dueDate,
        teamSize: patch.teamSize,
        budget: patch.budget,
        spent: patch.spent,
        currency: patch.currency,
        archived: patch.archived,
      }),
    }
  );
}

export function archiveApiProject(workspaceId: string, projectId: string) {
  return apiFetch<Project>(
    `/api/workspaces/${workspaceId}/projects/${projectId}/archive`,
    { method: "POST", workspaceId }
  );
}

export function deleteApiProject(
  workspaceId: string,
  projectId: string,
  confirmName: string
) {
  return apiFetch<{
    id: string;
    deleted: true;
    alreadyDeleted?: boolean;
    storage?: { deleted: number; skipped: number; errors: string[] };
    summary?: Record<string, number>;
  }>(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
    method: "DELETE",
    workspaceId,
    body: JSON.stringify({ confirmName }),
  });
}

export function createApiTask(workspaceId: string, task: Task) {
  return apiFetch<Task>(`/api/workspaces/${workspaceId}/tasks`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify({
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate || undefined,
      dueDate: task.dueDate || undefined,
      assigneeProfileId: task.assigneeId || undefined,
      parentId: task.parentId,
      milestoneId: task.milestoneId,
      sortOrder: task.order,
      requiresClientApproval: task.requiresClientApproval,
      dependsOn: task.dependsOn,
    }),
  });
}

export function patchApiTask(
  workspaceId: string,
  taskId: string,
  patch: Partial<Task>
) {
  return apiFetch<Task>(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
    method: "PATCH",
    workspaceId,
    body: JSON.stringify({
      title: patch.title,
      description: patch.description,
      status: patch.status,
      priority: patch.priority,
      startDate: patch.startDate,
      dueDate: patch.dueDate,
      assigneeProfileId: patch.assigneeId,
      parentId: patch.parentId,
      milestoneId: patch.milestoneId,
      sortOrder: patch.order,
      requiresClientApproval: patch.requiresClientApproval,
      dependsOn: patch.dependsOn,
    }),
  });
}

export function patchApiTaskStatus(
  workspaceId: string,
  taskId: string,
  status: TaskStatus
) {
  return apiFetch<Task>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}/status`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify({ status }),
    }
  );
}

export function authorizeApiTask(workspaceId: string, taskId: string) {
  return apiFetch<Task>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}/authorize-client`,
    { method: "POST", workspaceId }
  );
}

export function clientReviewApiTask(
  workspaceId: string,
  taskId: string,
  decision: Extract<
    TaskClientApprovalStatus,
    "approved" | "revision_requested" | "rejected"
  >,
  note?: string
) {
  return apiFetch<Task>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}/client-review`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ decision, note }),
    }
  );
}

export function deleteApiTask(workspaceId: string, taskId: string) {
  return apiFetch<{ ok: true }>(
    `/api/workspaces/${workspaceId}/tasks/${taskId}`,
    { method: "DELETE", workspaceId }
  );
}

export function createApiMilestone(workspaceId: string, milestone: Milestone) {
  return apiFetch<Milestone>(`/api/workspaces/${workspaceId}/milestones`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify({
      projectId: milestone.projectId,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate || undefined,
      status: milestone.status,
      progress: milestone.progress,
      deliverables: milestone.deliverables,
    }),
  });
}

export function patchApiMilestone(
  workspaceId: string,
  milestoneId: string,
  patch: Partial<Milestone>
) {
  return apiFetch<Milestone>(
    `/api/workspaces/${workspaceId}/milestones/${milestoneId}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify(patch),
    }
  );
}

export function patchApiMilestoneStatus(
  workspaceId: string,
  milestoneId: string,
  status: MilestoneStatus
) {
  return apiFetch<Milestone>(
    `/api/workspaces/${workspaceId}/milestones/${milestoneId}/status`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify({ status }),
    }
  );
}

export function deleteApiMilestone(workspaceId: string, milestoneId: string) {
  return apiFetch<{ ok: true }>(
    `/api/workspaces/${workspaceId}/milestones/${milestoneId}`,
    { method: "DELETE", workspaceId }
  );
}

export function createApiOpportunity(
  workspaceId: string,
  opp: Omit<MarketplaceOpportunity, "id" | "publishedAt" | "status">
) {
  return apiFetch<MarketplaceOpportunity>(
    `/api/workspaces/${workspaceId}/opportunities`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(opp),
    }
  );
}

export function patchApiOpportunity(
  workspaceId: string,
  id: string,
  patch: Partial<MarketplaceOpportunity>
) {
  return apiFetch<MarketplaceOpportunity>(
    `/api/workspaces/${workspaceId}/opportunities/${id}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify(patch),
    }
  );
}

export function deleteApiOpportunity(workspaceId: string, id: string) {
  return apiFetch<{ ok: true }>(
    `/api/workspaces/${workspaceId}/opportunities/${id}`,
    { method: "DELETE", workspaceId }
  );
}

export function saveApiOpportunity(workspaceId: string, opportunityId: string) {
  return apiFetch<{ ok: true }>(
    `/api/workspaces/${workspaceId}/opportunities/${opportunityId}/save`,
    { method: "POST", workspaceId }
  );
}

export function unsaveApiOpportunity(
  workspaceId: string,
  opportunityId: string
) {
  return apiFetch<{ ok: true }>(
    `/api/workspaces/${workspaceId}/opportunities/${opportunityId}/unsave`,
    { method: "POST", workspaceId }
  );
}

export function submitApiQuotation(
  workspaceId: string,
  quotation: Omit<Quotation, "id" | "submittedAt" | "status">
) {
  return apiFetch<Quotation>(`/api/workspaces/${workspaceId}/quotations`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify(quotation),
  });
}

export function acceptApiQuotation(workspaceId: string, quotationId: string) {
  return apiFetch<{ quotation: Quotation; assignment: DeveloperAssignment }>(
    `/api/workspaces/${workspaceId}/quotations/${quotationId}/accept`,
    { method: "POST", workspaceId }
  );
}

export function acceptApiFixedOpportunity(
  workspaceId: string,
  opportunityId: string,
  developerId: string
) {
  return apiFetch<DeveloperAssignment>(
    `/api/workspaces/${workspaceId}/opportunities/${opportunityId}/accept-fixed`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ developerProfileId: developerId }),
    }
  );
}

export function confirmApiAssignment(workspaceId: string, assignmentId: string) {
  return apiFetch<DeveloperAssignment>(
    `/api/workspaces/${workspaceId}/assignments/${assignmentId}/confirm`,
    { method: "POST", workspaceId }
  );
}

export function rejectApiAssignment(workspaceId: string, assignmentId: string) {
  return apiFetch<DeveloperAssignment>(
    `/api/workspaces/${workspaceId}/assignments/${assignmentId}/reject`,
    { method: "POST", workspaceId }
  );
}

export function patchApiAssignment(
  workspaceId: string,
  assignmentId: string,
  patch: Partial<DeveloperAssignment>
) {
  return apiFetch<DeveloperAssignment>(
    `/api/workspaces/${workspaceId}/assignments/${assignmentId}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify(patch),
    }
  );
}

export function requestApiExtension(
  workspaceId: string,
  assignmentId: string,
  requestedDeadline: string,
  reason: string
) {
  return apiFetch<DeveloperAssignment>(
    `/api/workspaces/${workspaceId}/assignments/${assignmentId}/extensions`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ requestedDeadline, reason }),
    }
  );
}

export function resolveApiExtension(
  workspaceId: string,
  assignmentId: string,
  decision: "approved" | "rejected"
) {
  return apiFetch<DeveloperAssignment>(
    `/api/workspaces/${workspaceId}/assignments/${assignmentId}/extensions/resolve`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ status: decision }),
    }
  );
}

export function createApiWorkSubmission(
  workspaceId: string,
  submission: {
    assignmentId?: string;
    taskId?: string;
    title: string;
    description?: string;
    repoUrl?: string;
    deployUrl?: string;
    designUrl?: string;
    files?: string[];
    screenshots?: string[];
    testingNotes?: string;
    projectId?: string;
    milestoneId?: string | null;
    requiresClientApproval?: boolean;
  }
) {
  return apiFetch<WorkSubmissionVersion>(
    `/api/workspaces/${workspaceId}/submissions`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(submission),
    }
  );
}

export function reviewApiWorkSubmission(
  workspaceId: string,
  submissionId: string,
  status: Extract<SubmissionStatus, "approved" | "rejected" | "in_review">,
  reviewNote?: string,
  authorizeClient?: boolean
) {
  // UI "Request revision" uses rejected/in_review — both become revision_requested
  const decision =
    status === "approved"
      ? "approved"
      : "revision_requested";
  return apiFetch<WorkSubmissionVersion>(
    `/api/workspaces/${workspaceId}/submissions/${submissionId}/review`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ decision, note: reviewNote }),
    }
  ).then(async (reviewed) => {
    if (authorizeClient && decision === "approved") {
      return authorizeApiSubmission(workspaceId, submissionId, reviewNote);
    }
    return reviewed;
  });
}

export function authorizeApiSubmission(
  workspaceId: string,
  submissionId: string,
  note?: string
) {
  return apiFetch<WorkSubmissionVersion>(
    `/api/workspaces/${workspaceId}/submissions/${submissionId}/authorize-client`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ note }),
    }
  );
}

export function clientReviewApiWork(
  workspaceId: string,
  submissionId: string,
  decision: "approved" | "revision_requested" | "rejected",
  note?: string
) {
  return apiFetch<WorkSubmissionVersion>(
    `/api/workspaces/${workspaceId}/submissions/${submissionId}/client-review`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({ decision, note }),
    }
  );
}

export function createApiThread(
  workspaceId: string,
  input: {
    subject?: string;
    visibility?: MessageThread["visibility"];
    projectId?: string | null;
    assignmentId?: string | null;
    recipientProfileId: string;
    participantProfileIds?: string[];
    body: string;
  }
) {
  return apiFetch<MessageThread>(`/api/workspaces/${workspaceId}/threads`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify(input),
  });
}

export function listApiThreads(workspaceId: string) {
  return apiFetch<MessageThread[]>(`/api/workspaces/${workspaceId}/threads`, {
    workspaceId,
  });
}

export function listApiMessagingRecipients(workspaceId: string) {
  return apiFetch<MessagingRecipient[]>(
    `/api/workspaces/${workspaceId}/messaging/recipients`,
    { workspaceId }
  );
}

export function listApiThreadMessages(
  workspaceId: string,
  threadId: string,
  opts?: { limit?: number; before?: string }
) {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.before) params.set("before", opts.before);
  const q = params.toString();
  return apiFetch<PortalMessage[]>(
    `/api/workspaces/${workspaceId}/threads/${threadId}/messages${q ? `?${q}` : ""}`,
    { workspaceId }
  );
}

export function sendApiMessage(
  workspaceId: string,
  message: Omit<PortalMessage, "id" | "createdAt" | "read">
) {
  return apiFetch<PortalMessage>(
    `/api/workspaces/${workspaceId}/threads/${message.threadId}/messages`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({
        body: message.body,
        visibility: message.visibility,
        attachmentName: message.attachmentName,
      }),
    }
  );
}

export function markApiThreadRead(workspaceId: string, threadId: string) {
  return apiFetch<MessageThread>(
    `/api/workspaces/${workspaceId}/threads/${threadId}/read`,
    {
      method: "POST",
      workspaceId,
    }
  );
}

export function createApiDocument(
  workspaceId: string,
  doc: Omit<ProjectDocument, "id" | "uploadedAt"> & { storagePath?: string }
) {
  return apiFetch<ProjectDocument>(`/api/workspaces/${workspaceId}/documents`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify({
      projectId: doc.projectId,
      name: doc.name,
      type: doc.type,
      sizeLabel: doc.sizeLabel,
      version: doc.version,
      url: doc.url,
      storagePath: doc.storagePath,
    }),
  });
}

export function deleteApiDocument(workspaceId: string, documentId: string) {
  return apiFetch<{ ok: true }>(
    `/api/workspaces/${workspaceId}/documents/${documentId}`,
    { method: "DELETE", workspaceId }
  );
}

export type ProductionTemplate = {
  id: string;
  workspaceId: string | null;
  code: string;
  name: string;
  description: string;
  stages: unknown;
  isSystem: boolean;
};

export function listApiProductionTemplates(workspaceId: string) {
  return apiFetch<ProductionTemplate[]>(
    `/api/workspaces/${workspaceId}/production-templates`,
    { workspaceId }
  );
}

export function createApiProductionTemplate(
  workspaceId: string,
  input: {
    code: string;
    name: string;
    description?: string;
    stages?: unknown;
  }
) {
  return apiFetch<ProductionTemplate>(
    `/api/workspaces/${workspaceId}/production-templates`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(input),
    }
  );
}

export function createApiComment(
  workspaceId: string,
  comment: Omit<ProjectComment, "id" | "createdAt">
) {
  return apiFetch<ProjectComment>(`/api/workspaces/${workspaceId}/comments`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify(comment),
  });
}

export function markApiNotificationRead(
  workspaceId: string,
  notificationId: string
) {
  return apiFetch<PortalNotification>(
    `/api/workspaces/${workspaceId}/notifications/${notificationId}/read`,
    { method: "POST", workspaceId }
  );
}

export function createApiInvoice(workspaceId: string, invoice: Invoice) {
  return apiFetch<Invoice>(`/api/workspaces/${workspaceId}/invoices`, {
    method: "POST",
    workspaceId,
    body: JSON.stringify(invoice),
  });
}

export function patchApiInvoice(
  workspaceId: string,
  invoiceId: string,
  patch: Partial<Invoice>
) {
  return apiFetch<Invoice>(
    `/api/workspaces/${workspaceId}/invoices/${invoiceId}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify(patch),
    }
  );
}

export function markApiEarningPaid(workspaceId: string, earningId: string) {
  return apiFetch<EarningRecord>(
    `/api/workspaces/${workspaceId}/earnings/${earningId}/mark-paid`,
    { method: "POST", workspaceId }
  );
}

export function registerApiDeveloper(profile: DeveloperProfile) {
  return apiFetch<DeveloperProfile>("/api/developers/register", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function patchApiDeveloper(
  developerId: string,
  patch: Partial<DeveloperProfile>
) {
  return apiFetch<DeveloperProfile>(`/api/developers/${developerId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function setApiDeveloperStatus(
  workspaceId: string,
  developerId: string,
  status: DeveloperStatus
) {
  return apiFetch<DeveloperProfile>(
    `/api/workspaces/${workspaceId}/developers/${developerId}/status`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify({ status }),
    }
  );
}

export function setApiOpportunityStatus(
  workspaceId: string,
  id: string,
  status: OpportunityStatus
) {
  return patchApiOpportunity(workspaceId, id, { status });
}

export function updateApiQuotationStatus(
  workspaceId: string,
  id: string,
  status: QuotationStatus
) {
  return apiFetch<Quotation>(
    `/api/workspaces/${workspaceId}/quotations/${id}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify({ status }),
    }
  ).catch(async () => {
    // Some backends only expose accept; treat as soft no-op shape
    return { id, status } as Quotation;
  });
}
