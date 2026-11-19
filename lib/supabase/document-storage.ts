import { apiFetch } from "@/lib/api/client";

const MAX_BYTES = 25 * 1024 * 1024;

export type DocumentUploadUrlResponse = {
  bucket: string;
  path: string;
  signedUrl: string;
  token?: string;
  storageUrl: string;
};

export async function requestDocumentUploadUrl(
  workspaceId: string,
  input: { projectId: string; fileName: string; contentType?: string }
) {
  return apiFetch<DocumentUploadUrlResponse>(
    `/api/workspaces/${workspaceId}/documents/upload-url`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify(input),
    }
  );
}

export async function requestDocumentDownloadUrl(
  workspaceId: string,
  documentId: string
) {
  return apiFetch<{ url: string; name: string; kind: "signed" | "external" }>(
    `/api/workspaces/${workspaceId}/documents/${documentId}/download-url`,
    {
      method: "POST",
      workspaceId,
      body: JSON.stringify({}),
    }
  );
}

export async function uploadProjectDocumentFile(input: {
  workspaceId: string;
  projectId: string;
  file: File;
}): Promise<{ storagePath: string; storageUrl: string; sizeLabel: string }> {
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    throw new Error("Each file must be between 1 byte and 25 MB");
  }

  const signed = await requestDocumentUploadUrl(input.workspaceId, {
    projectId: input.projectId,
    fileName: input.file.name,
    contentType: input.file.type || "application/octet-stream",
  });

  // Supabase signed upload typically expects PUT with optional token header.
  const headers: Record<string, string> = {
    "Content-Type": input.file.type || "application/octet-stream",
  };
  if (signed.token) {
    headers["x-upsert"] = "false";
  }

  const res = await fetch(signed.signedUrl, {
    method: "PUT",
    headers,
    body: input.file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload failed (${res.status})`);
  }

  const mb = input.file.size / (1024 * 1024);
  const sizeLabel =
    mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(input.file.size / 1024))} KB`;

  return {
    storagePath: signed.path,
    storageUrl: signed.storageUrl,
    sizeLabel,
  };
}

export async function openDocumentDownload(
  workspaceId: string,
  documentId: string
) {
  const data = await requestDocumentDownloadUrl(workspaceId, documentId);
  window.open(data.url, "_blank", "noopener,noreferrer");
  return data;
}
