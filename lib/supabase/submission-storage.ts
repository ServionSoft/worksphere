import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const WORK_SUBMISSIONS_BUCKET = "work-submissions";
const MAX_BYTES = 10 * 1024 * 1024;

export type StorageMode = "supabase" | "url-only" | "unavailable";

let cachedMode: StorageMode | null = null;

export async function detectSubmissionStorageMode(): Promise<StorageMode> {
  if (cachedMode) return cachedMode;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    cachedMode = "unavailable";
    return cachedMode;
  }

  // Prefer list probe — getBucket often requires elevated rights.
  const root = await supabase.storage
    .from(WORK_SUBMISSIONS_BUCKET)
    .list("", { limit: 1 });
  if (!root.error) {
    cachedMode = "supabase";
    return cachedMode;
  }

  // Some clients reject empty path; retry with workspace-root style list.
  const retry = await supabase.storage
    .from(WORK_SUBMISSIONS_BUCKET)
    .list(".", { limit: 1 });
  if (!retry.error) {
    cachedMode = "supabase";
    return cachedMode;
  }

  cachedMode = "url-only";
  return cachedMode;
}

export function resetSubmissionStorageModeCache() {
  cachedMode = null;
}

export type UploadedDeliverable = {
  path: string;
  name: string;
  size: number;
  type: string;
};

export async function uploadSubmissionFile(input: {
  file: File;
  workspaceId: string;
  taskId: string;
}): Promise<UploadedDeliverable> {
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    throw new Error("Each file must be between 1 byte and 10 MB");
  }
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured for uploads");
  }

  const safeName = input.file.name.replace(/[^\w.\-()+ ]+/g, "_");
  const path = `${input.workspaceId}/${input.taskId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(WORK_SUBMISSIONS_BUCKET)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type || "application/octet-stream",
    });

  if (error) {
    throw new Error(error.message || "Upload failed");
  }

  return {
    path,
    name: input.file.name,
    size: input.file.size,
    type: input.file.type || "application/octet-stream",
  };
}

/** Encode storage path + display name for DB files[] entries. */
export function encodeStorageFileRef(file: UploadedDeliverable): string {
  return `storage://${file.path}|${file.name}`;
}

export function parseFileRef(ref: string): {
  kind: "storage" | "url" | "name";
  path?: string;
  url?: string;
  name: string;
} {
  if (ref.startsWith("storage://")) {
    const raw = ref.slice("storage://".length);
    const [path, name] = raw.split("|");
    return { kind: "storage", path, name: name || path.split("/").pop() || path };
  }
  if (/^https?:\/\//i.test(ref)) {
    return { kind: "url", url: ref, name: ref };
  }
  return { kind: "name", name: ref };
}

export async function createSignedFileUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(WORK_SUBMISSIONS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
