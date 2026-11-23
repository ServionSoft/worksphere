import { apiFetch } from "@/lib/api/client";
import type { AppRole, PortalKind, SessionUser } from "@/lib/portal-types";

export interface AuthMeResponse {
  profile: {
    id: string;
    authUserId: string;
    email: string;
    fullName: string;
    isSuperAdmin: boolean;
    developerProfileId: string | null;
    clientIds: string[];
    title?: string | null;
    avatarUrl?: string | null;
    createdAt?: string | null;
  };
  memberships: Array<{
    workspaceId: string;
    role: AppRole;
    active: boolean;
  }>;
}

export interface AuthWorkspaceRow {
  id: string;
  name: string;
  status: string;
  plan: string;
  role: AppRole;
  color?: string | null;
  companyName?: string | null;
  seats?: number;
}

function portalForRole(role: AppRole): PortalKind {
  if (role === "client") return "client";
  if (role === "developer") return "developer";
  return "admin";
}

/** Map /api/auth/me + preferred portal into SessionUser. */
export function sessionUserFromMe(
  me: AuthMeResponse,
  preferredPortal: PortalKind
): SessionUser | null {
  const { profile, memberships } = me;

  if (profile.isSuperAdmin) {
    return {
      id: profile.id,
      name: profile.fullName,
      email: profile.email,
      role: "super_admin",
      portal: "admin",
      title: profile.title ?? "Platform Super Admin",
    };
  }

  const active = memberships.filter((m) => m.active);
  const forPortal = active.find((m) => portalForRole(m.role) === preferredPortal);
  const pick = forPortal ?? active[0];
  if (!pick) {
    if (profile.developerProfileId && preferredPortal === "developer") {
      return {
        id: profile.id,
        name: profile.fullName,
        email: profile.email,
        role: "developer",
        portal: "developer",
        developerId: profile.developerProfileId,
        title: profile.title ?? undefined,
      };
    }
    return null;
  }

  if (portalForRole(pick.role) !== preferredPortal && preferredPortal !== "admin") {
    return null;
  }

  return {
    id: profile.id,
    name: profile.fullName,
    email: profile.email,
    role: pick.role,
    portal: portalForRole(pick.role),
    clientId: profile.clientIds[0],
    developerId: profile.developerProfileId ?? undefined,
    title: profile.title ?? undefined,
  };
}

export function fetchMe() {
  return apiFetch<AuthMeResponse>("/api/auth/me");
}

export function fetchMyWorkspaces() {
  return apiFetch<AuthWorkspaceRow[]>("/api/auth/workspaces");
}

export function bootstrapProfile(body: {
  fullName?: string;
  title?: string;
}) {
  return apiFetch<AuthMeResponse>("/api/auth/bootstrap", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchMe(body: {
  fullName?: string;
  title?: string | null;
  avatarUrl?: string | null;
}) {
  return apiFetch<AuthMeResponse["profile"]>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type NotificationCategoryPreferences = {
  projects: boolean;
  milestones: boolean;
  marketplaceOpportunities: boolean;
  bidUpdates: boolean;
  assignments: boolean;
  taskUpdates: boolean;
  submissionFeedback: boolean;
  revisionRequests: boolean;
  approvals: boolean;
  messages: boolean;
  earnings: boolean;
  finance: boolean;
  account: boolean;
  securityAlerts: boolean;
};

export type NotificationPreferences = NotificationCategoryPreferences & {
  channels: { inApp: boolean; email: boolean };
  email: NotificationCategoryPreferences;
};

export type ApplicationPreferences = {
  theme: "system" | "light" | "dark";
  timezone: string;
  dateFormat: "ymd" | "mdy" | "dmy";
  timeFormat: "12h" | "24h";
};

export type ProfilePreferences = {
  notifications: NotificationPreferences;
  application: ApplicationPreferences;
  deactivationRequestedAt: string | null;
  deletionRequestedAt: string | null;
  emailDelivery?: {
    configured: boolean;
    provider: string;
    missingEnv: string[];
  };
};

export function fetchPreferences() {
  return apiFetch<ProfilePreferences>("/api/auth/preferences");
}

export function patchPreferences(body: {
  notifications?: Partial<NotificationPreferences>;
  application?: Partial<ApplicationPreferences>;
  requestDeactivation?: boolean;
  requestDeletion?: boolean;
  clearDeactivationRequest?: boolean;
  clearDeletionRequest?: boolean;
}) {
  return apiFetch<ProfilePreferences>("/api/auth/preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function onboard(body: {
  kind: "tenant_admin" | "client" | "developer";
  workspaceName?: string;
  companyName?: string;
  clientName?: string;
  developer?: {
    title?: string;
    skills?: string[];
    bio?: string;
    phone?: string;
    country?: string;
    hourlyRate?: number;
    experienceYears?: number;
    portfolioUrl?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    availability?: "available" | "limited" | "unavailable";
  };
}) {
  return apiFetch<{
    workspaceId?: string;
    membership?: { workspaceId: string; role: AppRole };
    developerProfileId?: string;
    clientId?: string;
  }>("/api/auth/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
