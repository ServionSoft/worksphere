import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) {
    throw new ApiError(
      "NEXT_PUBLIC_API_URL is not configured",
      "CONFIG_ERROR",
      500
    );
  }
  return base.replace(/\/$/, "");
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

let activeWorkspaceId: string | null = null;

export function setApiWorkspaceId(workspaceId: string | null) {
  activeWorkspaceId = workspaceId;
}

export function getApiWorkspaceId() {
  return activeWorkspaceId;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { workspaceId?: string | null } = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new ApiError("Not authenticated", "UNAUTHORIZED", 401);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const ws =
    init.workspaceId === undefined ? activeWorkspaceId : init.workspaceId;
  if (ws) headers.set("x-workspace-id", ws);

  const rest = { ...init };
  delete rest.workspaceId;
  const res = await fetch(`${apiBase()}${path}`, { ...rest, headers });

  let body: ApiSuccess<T> | ApiFailure | null = null;
  try {
    body = (await res.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    body = null;
  }

  if (!res.ok || !body || body.success !== true) {
    const err = body && "error" in body ? body.error : null;
    throw new ApiError(
      err?.message ?? `Request failed (${res.status})`,
      err?.code ?? "REQUEST_FAILED",
      res.status,
      err?.details
    );
  }

  return body.data;
}
