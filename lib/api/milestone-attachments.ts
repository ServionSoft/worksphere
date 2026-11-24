import { apiFetch } from "@/lib/api/client";

export type AttachmentCategory =
  | "scope"
  | "reference"
  | "design"
  | "technical"
  | "source"
  | "required_deliverable"
  | "developer_submission"
  | "final_deliverable";

export type AttachmentVisibility = "internal" | "developer" | "client";

export type MilestoneAttachment = {
  id: string;
  workspaceId: string;
  projectId: string;
  milestoneId: string;
  uploadedByProfileId: string | null;
  uploadedByName: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  description: string;
  category: AttachmentCategory;
  visibility: AttachmentVisibility;
  workSubmissionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StagedAttachment = {
  localId: string;
  file: File;
  description: string;
  category: AttachmentCategory;
  visibility: AttachmentVisibility;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  remote?: MilestoneAttachment;
};

const DEFAULT_MAX = 25 * 1024 * 1024;

export function listApiMilestoneAttachments(
  workspaceId: string,
  milestoneId: string
) {
  return apiFetch<{
    items: MilestoneAttachment[];
    limits: { maxBytes: number; bucket: string };
  }>(`/api/workspaces/${workspaceId}/milestones/${milestoneId}/attachments`, {
    workspaceId,
  });
}

export function requestMilestoneAttachmentUploadUrl(
  workspaceId: string,
  milestoneId: string,
  input: { fileName: string; contentType?: string; sizeBytes?: number }
) {
  return apiFetch<{
    bucket: string;
    path: string;
    signedUrl: string;
    token?: string;
    storageUrl: string;
    mimeType: string;
    maxBytes: number;
  }>(
    `/api/workspaces/${workspaceId}/milestones/${milestoneId}/attachments/upload-url`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(input),
    }
  );
}

export function createApiMilestoneAttachment(
  workspaceId: string,
  milestoneId: string,
  body: {
    storagePath: string;
    name: string;
    mimeType?: string;
    sizeBytes?: number;
    description?: string;
    category?: AttachmentCategory;
    visibility?: AttachmentVisibility;
    workSubmissionId?: string | null;
  }
) {
  return apiFetch<MilestoneAttachment>(
    `/api/workspaces/${workspaceId}/milestones/${milestoneId}/attachments`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(body),
    }
  );
}

export function patchApiMilestoneAttachment(
  workspaceId: string,
  attachmentId: string,
  body: {
    description?: string;
    category?: AttachmentCategory;
    visibility?: AttachmentVisibility;
  }
) {
  return apiFetch<MilestoneAttachment>(
    `/api/workspaces/${workspaceId}/attachments/${attachmentId}`,
    {
      method: "PATCH",
      workspaceId,
      body: JSON.stringify(body),
    }
  );
}

export function deleteApiMilestoneAttachment(
  workspaceId: string,
  attachmentId: string
) {
  return apiFetch<{ id: string; deleted: boolean }>(
    `/api/workspaces/${workspaceId}/attachments/${attachmentId}`,
    { method: "DELETE", workspaceId }
  );
}

export function requestMilestoneAttachmentDownloadUrl(
  workspaceId: string,
  attachmentId: string
) {
  return apiFetch<{
    url: string;
    name: string;
    mimeType: string;
    kind: "signed" | "external";
  }>(
    `/api/workspaces/${workspaceId}/attachments/${attachmentId}/download-url`,
    { method: "POST", workspaceId, body: JSON.stringify({}) }
  );
}

export function promoteApiSubmissionFiles(
  workspaceId: string,
  milestoneId: string,
  body: {
    submissionId: string;
    fileRefs: string[];
    visibility?: AttachmentVisibility;
    category?: AttachmentCategory;
    description?: string;
  }
) {
  return apiFetch<{ items: MilestoneAttachment[] }>(
    `/api/workspaces/${workspaceId}/milestones/${milestoneId}/attachments/promote`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(body),
    }
  );
}

export async function uploadMilestoneAttachmentFile(input: {
  workspaceId: string;
  milestoneId: string;
  file: File;
  description?: string;
  category?: AttachmentCategory;
  visibility?: AttachmentVisibility;
  onProgress?: (pct: number) => void;
}): Promise<MilestoneAttachment> {
  const max = DEFAULT_MAX;
  if (input.file.size <= 0 || input.file.size > max) {
    throw new Error(
      `Each file must be between 1 byte and ${Math.round(max / (1024 * 1024))} MB`
    );
  }
  input.onProgress?.(5);
  const signed = await requestMilestoneAttachmentUploadUrl(
    input.workspaceId,
    input.milestoneId,
    {
      fileName: input.file.name,
      contentType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
    }
  );
  input.onProgress?.(20);

  const headers: Record<string, string> = {
    "Content-Type": input.file.type || "application/octet-stream",
  };
  if (signed.token) headers["x-upsert"] = "false";

  const res = await fetch(signed.signedUrl, {
    method: "PUT",
    headers,
    body: input.file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload failed (${res.status})`);
  }
  input.onProgress?.(80);

  const created = await createApiMilestoneAttachment(
    input.workspaceId,
    input.milestoneId,
    {
      storagePath: signed.path,
      name: input.file.name,
      mimeType: input.file.type || signed.mimeType,
      sizeBytes: input.file.size,
      description: input.description,
      category: input.category,
      visibility: input.visibility,
    }
  );
  input.onProgress?.(100);
  return created;
}

export async function openMilestoneAttachmentDownload(
  workspaceId: string,
  attachmentId: string
) {
  const data = await requestMilestoneAttachmentDownloadUrl(
    workspaceId,
    attachmentId
  );
  window.open(data.url, "_blank", "noopener,noreferrer");
  return data;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
