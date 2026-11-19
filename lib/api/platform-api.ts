import { apiFetch } from "@/lib/api/client";

export function fetchPlatformTenants() {
  return apiFetch<unknown[]>("/api/platform/tenants");
}

export function patchPlatformTenant(
  tenantId: string,
  status: "active" | "suspended"
) {
  return apiFetch<{ id: string; name: string; status: string }>(
    `/api/platform/tenants/${tenantId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

export function fetchPlatformSubscriptions() {
  return apiFetch<unknown[]>("/api/platform/subscriptions");
}

export function fetchPlatformRevenue() {
  return apiFetch<Record<string, unknown>>("/api/platform/revenue");
}

export function fetchPlatformActivity() {
  return apiFetch<unknown[]>("/api/platform/activity");
}

export function fetchPlatformSettings() {
  return apiFetch<Record<string, unknown>>("/api/platform/settings");
}

export function updatePlatformSettings(settings: Record<string, unknown>) {
  return apiFetch<Record<string, unknown>>("/api/platform/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export function postAiChat(message: string, workspaceId?: string) {
  return apiFetch<{ reply: string }>("/api/ai/chat", {
    method: "POST",
    workspaceId: workspaceId ?? null,
    body: JSON.stringify({ message, workspaceId }),
  });
}

export function fetchReportsSummary(workspaceId: string) {
  return apiFetch<Record<string, number>>(
    `/api/workspaces/${workspaceId}/reports/summary`,
    { workspaceId }
  );
}
