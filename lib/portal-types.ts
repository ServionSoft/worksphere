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

export type OpportunityStatus = "open" | "closed" | "filled";

export type ExperienceLevel = "junior" | "mid" | "senior" | "lead";

export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "revision_requested"
  | "approved"
  | "completed";

export type QuotationStatus =
  | "pending"
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
  rating: number;
  completedAssignments: number;
  onTimePercent: number;
  totalEarnings: number;
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
  projectId?: string;
  projectName?: string;
  publishedBy: string;
  publishedAt: string;
  attachments: string[];
}

export interface Quotation {
  id: string;
  opportunityId: string;
  developerId: string;
  developerName: string;
  price: number;
  estimatedDays: number;
  coverMessage: string;
  status: QuotationStatus;
  submittedAt: string;
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
  status: AssignmentStatus;
  progress: number;
  checklist: Array<{ id: string; label: string; done: boolean }>;
  requirements: string;
}

export interface WorkSubmissionVersion {
  id: string;
  assignmentId: string;
  projectId?: string;
  version: number;
  title: string;
  description: string;
  repoUrl?: string;
  deployUrl?: string;
  files: string[];
  screenshots: string[];
  submittedAt: string;
  submittedBy: string;
  status: SubmissionStatus;
  revisionNotes?: string;
  requiresClientApproval: boolean;
  clientApprovalStatus: ClientApprovalStatus;
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
  visibility: MessageVisibility;
  lastMessageAt: string;
  unreadCount: number;
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
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface SavedOpportunity {
  developerId: string;
  opportunityId: string;
}

export type { Priority };
