import type { Priority, SubmissionStatus } from "@/lib/types";

export type AppRole =
  | "super_admin"
  | "tenant_admin"
  | "project_manager"
  | "internal_member"
  | "client"
  | "developer";

export type PortalKind = "admin" | "client" | "developer";

export type DeveloperStatus =
  | "pending_verification"
  | "verified"
  | "rejected"
  | "suspended";

export type OpportunityPricing = "fixed" | "quotation";

export type OpportunityStatus = "draft" | "open" | "closed" | "filled";

export type ExperienceLevel = "junior" | "mid" | "senior" | "lead";

export type AssignmentStatus =
  | "pending_confirmation"
  | "not_started"
  | "in_progress"
  | "submitted"
  | "revision_requested"
  | "approved"
  | "completed";

export type OpportunityVisibility = "public" | "private" | "direct";

export type QuotationStatus =
  | "pending"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "partial";

export type PaymentStatus = "pending" | "approved" | "paid";

export type MessageVisibility = "client" | "developer" | "internal";

export type ClientApprovalStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "revision_requested"
  | "rejected";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  portal: PortalKind;
  clientId?: string;
  developerId?: string;
  title?: string;
}

export interface DeveloperProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  title: string;
  skills: string[];
  experienceYears: number;
  hourlyRate: number;
  availability: "available" | "limited" | "unavailable";
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  bio: string;
  status: DeveloperStatus;
  verificationNote?: string;
  verifiedAt?: string;
  rating: number;
  completedAssignments: number;
  onTimePercent: number;
  totalEarnings: number;
  workspaceId?: string;
  /** Local demo CV metadata only — never uploaded to cloud storage. */
  cvMeta?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    selectedAt: string;
  } | null;
}

export interface MarketplaceOpportunity {
  id: string;
  title: string;
  summary: string;
  description: string;
  scope: string[];
  requirements: string[];
  skills: string[];
  deliverables: string[];
  category: string;
  pricing: OpportunityPricing;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  estimatedDays: number;
  deadline: string;
  experienceLevel: ExperienceLevel;
  status: OpportunityStatus;
  visibility: OpportunityVisibility;
  workspaceId?: string;
  projectId?: string;
  projectName?: string;
  milestoneId?: string;
  isMilestoneOpportunity?: boolean;
  publishedBy: string;
  publishedAt: string;
  attachments: string[];
  invitedDeveloperIds?: string[];
}

export interface Quotation {
  id: string;
  opportunityId: string;
  developerId: string;
  developerName: string;
  developerStatus?: string;
  developerSkills?: string[];
  developerTitle?: string;
  developerRating?: number;
  price: number;
  estimatedDays: number;
  coverMessage: string;
  approach?: string;
  understanding?: string;
  relevantExperience?: string;
  portfolioLinks?: string[];
  attachments?: string[];
  rejectionReason?: string;
  adminNotes?: string;
  shortlistedAt?: string;
  decidedAt?: string;
  status: QuotationStatus;
  submittedAt: string;
}

export interface QuotationSubmitInput {
  opportunityId: string;
  developerId: string;
  developerName: string;
  price: number;
  estimatedDays: number;
  coverMessage: string;
  approach?: string;
  understanding?: string;
  relevantExperience?: string;
  portfolioLinks?: string[];
  attachments?: string[];
}

export interface QuotationPatchInput {
  status?: QuotationStatus;
  rejectionReason?: string;
  adminNotes?: string;
  price?: number;
  estimatedDays?: number;
  coverMessage?: string;
  approach?: string;
  understanding?: string;
  relevantExperience?: string;
  portfolioLinks?: string[];
  attachments?: string[];
}

export interface AwardQuotationInput {
  approvedAmount?: number;
  approvedDays?: number;
  note?: string;
}

export interface DeveloperAssignment {
  id: string;
  opportunityId: string;
  developerId: string;
  developerName: string;
  title: string;
  projectId?: string;
  projectName?: string;
  budget: number;
  currency: string;
  startDate: string;
  deadline: string;
  originalDeadline?: string;
  status: AssignmentStatus;
  progress: number;
  checklist: Array<{ id: string; label: string; done: boolean }>;
  requirements: string;
  priceLocked?: boolean;
  deadlineLocked?: boolean;
  quotationId?: string;
  extensionRequest?: {
    id?: string;
    requestedDeadline: string;
    reason: string;
    status: "pending" | "approved" | "rejected";
  };
}

export interface WorkSubmissionVersion {
  id: string;
  assignmentId?: string;
  taskId?: string;
  projectId?: string;
  version: number;
  title: string;
  description: string;
  repoUrl?: string;
  deployUrl?: string;
  designUrl?: string;
  files: string[];
  screenshots: string[];
  testingNotes?: string;
  submittedAt: string;
  submittedBy: string;
  status: SubmissionStatus;
  revisionNotes?: string;
  requiresClientApproval: boolean;
  /** Only pending after admin authorizes client review */
  clientApprovalStatus: ClientApprovalStatus;
  authorizedForClient: boolean;
  internalReviewerName?: string;
  internalReviewedAt?: string;
  internalReviewNote?: string;
  clientReviewerName?: string;
  clientReviewedAt?: string;
  milestoneId?: string;
}

export interface PortalMessage {
  id: string;
  threadId: string;
  projectId?: string;
  assignmentId?: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  visibility: MessageVisibility;
  read: boolean;
  attachmentName?: string;
}

export interface MessageThread {
  id: string;
  subject: string;
  projectId?: string;
  projectName?: string;
  assignmentId?: string;
  participants: string[];
  participantNames?: string[];
  visibility: MessageVisibility;
  lastMessageAt: string;
  lastMessagePreview?: string;
  lastMessageAuthorName?: string;
  unreadCount: number;
}

export interface MessagingRecipient {
  id: string;
  name: string;
  email: string;
  kind: "admin" | "developer" | "client";
  role?: string;
  projectIds: string[];
}

export interface Invoice {
  id: string;
  clientId: string;
  projectId: string;
  projectName: string;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  milestoneTitle?: string;
}

export interface EarningRecord {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  developerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  earnedAt: string;
  paidAt?: string;
}

export interface PortalNotification {
  id: string;
  portal: PortalKind;
  userId: string;
  /** Demo tenant scope — filtered when switching workspaces. */
  workspaceId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  category?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  emailStatus?: string;
}

export interface SavedOpportunity {
  developerId: string;
  opportunityId: string;
}

export type { Priority };
