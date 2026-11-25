export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "at_risk";

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";

export type Priority = "low" | "medium" | "high" | "critical";

export type ActivityType =
  | "task_assigned"
  | "status_change"
  | "submission"
  | "approval"
  | "comment"
  | "project_update";

export type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "missed";

export type DocumentType = "file" | "deliverable" | "link";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  color: string;
  companyName?: string;
  seats?: number;
  status?: "active" | "suspended";
}

export type ClientStatus = "active" | "inactive" | "prospect";

export type ClientPortalAccessStatus = "none" | "invited" | "active";

export interface Client {
  id: string;
  name: string;
  industry: string;
  workspaceId?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status?: ClientStatus;
  notes?: string;
  primaryProfileId?: string | null;
  portalAccessStatus?: ClientPortalAccessStatus;
  invitedAt?: string | null;
  inviteEmail?: string;
  linkedProfileName?: string;
  linkedProfileEmail?: string;
  /** Present on invite responses when Auth generate_link succeeds (SMTP fallback). */
  inviteActionLink?: string;
}

export interface TeamMember extends User {
  workspaceId?: string;
  title?: string;
  active?: boolean;
  memberId?: string;
  permissionRole?:
    | "tenant_admin"
    | "project_manager"
    | "internal_member";
  inviteActionLink?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  clientId: string;
  clientName: string;
  managerId: string;
  managerName: string;
  status: ProjectStatus;
  progress: number;
  priority: Priority;
  startDate: string;
  dueDate: string;
  teamSize: number;
  budget: number;
  spent: number;
  currency: string;
  archived?: boolean;
  developerIds?: string[];
  objectives?: string;
  scopeText?: string;
  scopeDocumentId?: string | null;
}

export type TaskClientApprovalStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "revision_requested"
  | "rejected";

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  status: TaskStatus;
  priority: Priority;
  startDate: string;
  dueDate: string;
  assigneeId: string;
  assigneeName: string;
  parentId?: string | null;
  dependsOn: string[];
  milestoneId?: string | null;
  order: number;
  /** Parent project tasks default to client sign-off after admin. */
  requiresClientApproval?: boolean;
  authorizedForClient?: boolean;
  clientApprovalStatus?: TaskClientApprovalStatus;
  extensionRequest?: {
    id?: string;
    requestedDueDate: string;
    reason: string;
    status: "pending" | "approved" | "rejected";
  };
}

export type MilestonePlanStatus = "suggested" | "approved" | "archived";
export type MilestoneCommercialStatus =
  | "unpriced"
  | "priced"
  | "awarded"
  | "invoiced"
  | "paid";
export type MilestoneMarketplaceStatus =
  | "not_published"
  | "published"
  | "filled"
  | "closed";

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  publicDescription?: string;
  dueDate: string;
  status: MilestoneStatus;
  deliverables: string[];
  progress: number;
  weight?: number;
  sortOrder?: number;
  planStatus?: MilestonePlanStatus;
  acceptanceCriteria?: string;
  requiredSkills?: string[];
  dependencyIds?: string[];
  estimatedDays?: number | null;
  currency?: string;
  commercialStatus?: MilestoneCommercialStatus;
  marketplaceStatus?: MilestoneMarketplaceStatus;
  opportunityId?: string | null;
  source?: "manual" | "ai";
  approvedAt?: string | null;
  clientPrice?: number;
  developerBudget?: number;
  awardedDeveloperCost?: number | null;
  grossMargin?: number;
  grossMarginPct?: number | null;
  fundingStatus?:
    | "not_funded"
    | "funding_pending"
    | "funded"
    | "funding_failed"
    | "refunded"
    | "on_hold"
    | string;
  fundedAt?: string | null;
  deliveryApprovedAt?: string | null;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  version: string;
  url?: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  taskId?: string | null;
}

export interface Submission {
  id: string;
  projectId: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  status: SubmissionStatus;
  reviewerName?: string;
  reviewNote?: string;
  relatedTaskId?: string | null;
  documentIds: string[];
  /** Links admin Submission row to portal WorkSubmissionVersion */
  workSubmissionId?: string | null;
  assignmentId?: string | null;
  authorizedForClient?: boolean;
  reviewedAt?: string;
}

export interface Deadline {
  id: string;
  title: string;
  projectName: string;
  date: string;
  type: "milestone" | "deadline" | "review";
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  actorName: string;
  timestamp: string;
  projectId?: string;
  projectName?: string;
}

export interface KpiSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueTasks: number;
  pendingApprovals: number;
  teamMembers: number;
}

export interface ChartSlice {
  name: string;
  value: number;
  fill?: string;
}

export interface WorkloadPoint {
  name: string;
  tasks: number;
}
