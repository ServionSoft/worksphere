"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileIcon,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  type AttachmentCategory,
  type AttachmentVisibility,
  type MilestoneAttachment,
  type StagedAttachment,
  deleteApiMilestoneAttachment,
  formatBytes,
  listApiMilestoneAttachments,
  openMilestoneAttachmentDownload,
  patchApiMilestoneAttachment,
  uploadMilestoneAttachmentFile,
} from "@/lib/api/milestone-attachments";
import { isApiDataSource } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES: { id: AttachmentCategory; label: string }[] = [
  { id: "scope", label: "Scope" },
  { id: "reference", label: "Reference" },
  { id: "design", label: "Design" },
  { id: "technical", label: "Technical" },
  { id: "source", label: "Source" },
  { id: "required_deliverable", label: "Required deliverable" },
  { id: "developer_submission", label: "Developer submission" },
  { id: "final_deliverable", label: "Final deliverable" },
];

const VISIBILITIES: { id: AttachmentVisibility; label: string; hint: string }[] =
  [
    { id: "internal", label: "Internal only", hint: "Staff only" },
    {
      id: "developer",
      label: "Shared with developer",
      hint: "Assigned developers",
    },
    { id: "client", label: "Client-visible", hint: "Authorized clients" },
  ];

function fileIcon(mime: string, name: string) {
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name))
    return FileImage;
  if (mime.startsWith("video/") || /\.(mp4|webm)$/i.test(name)) return FileVideo;
  if (mime.includes("pdf") || /\.pdf$/i.test(name)) return FileText;
  return FileIcon;
}

function visibilityTone(v: AttachmentVisibility) {
  if (v === "client") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (v === "developer") return "bg-sky-50 text-sky-800 border-sky-200";
  return "bg-muted text-muted-foreground border-border";
}

export type MilestoneAttachmentsPanelProps = {
  workspaceId: string;
  milestoneId?: string | null;
  /** When no milestoneId yet, stage files locally and flush after create. */
  staged?: StagedAttachment[];
  onStagedChange?: (next: StagedAttachment[]) => void;
  readOnly?: boolean;
  /** Hide internal management controls (developer/client views). */
  compact?: boolean;
  className?: string;
  title?: string;
};

export function MilestoneAttachmentsPanel({
  workspaceId,
  milestoneId,
  staged,
  onStagedChange,
  readOnly = false,
  compact = false,
  className,
  title = "Scope, Deliverables & Attachments",
}: MilestoneAttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MilestoneAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  const refresh = useCallback(async () => {
    if (!isApiDataSource() || !milestoneId) return;
    setLoading(true);
    try {
      const data = await listApiMilestoneAttachments(workspaceId, milestoneId);
      setItems(data.items);
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Could not load attachments"
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId, milestoneId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const list = milestoneId ? items : [];
    return list.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (!q.trim()) return true;
      const hay = `${a.name} ${a.description} ${a.category}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [items, milestoneId, categoryFilter, q]);

  function stageFiles(files: FileList | File[]) {
    if (!onStagedChange) return;
    const next = [...(staged ?? [])];
    for (const file of Array.from(files)) {
      next.push({
        localId: crypto.randomUUID(),
        file,
        description: "",
        category: "reference",
        visibility: "internal",
        progress: 0,
        status: "pending",
      });
    }
    onStagedChange(next);
  }

  async function uploadFiles(files: FileList | File[]) {
    if (readOnly) return;
    if (!milestoneId) {
      stageFiles(files);
      return;
    }
    if (!isApiDataSource()) {
      toast.message("Demo mode — file upload requires API + Storage");
      return;
    }

    for (const file of Array.from(files)) {
      const tempId = `up-${crypto.randomUUID()}`;
      setBusyId(tempId);
      try {
        const created = await uploadMilestoneAttachmentFile({
          workspaceId,
          milestoneId,
          file,
          category: "reference",
          visibility: "internal",
        });
        setItems((prev) => [created, ...prev]);
        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : `Failed to upload ${file.name}`
        );
      } finally {
        setBusyId(null);
      }
    }
  }

  async function onDownload(id: string) {
    try {
      await openMilestoneAttachmentDownload(workspaceId, id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function onPreview(att: MilestoneAttachment) {
    try {
      const data = await openMilestoneAttachmentDownload(workspaceId, att.id);
      if (
        att.mimeType.startsWith("image/") ||
        att.mimeType === "application/pdf"
      ) {
        setPreviewUrl(data.url);
        setPreviewName(att.name);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    }
  }

  async function onDelete(id: string) {
    if (readOnly) return;
    setBusyId(id);
    try {
      await deleteApiMilestoneAttachment(workspaceId, id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast.success("Attachment removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onPatch(
    id: string,
    patch: {
      description?: string;
      category?: AttachmentCategory;
      visibility?: AttachmentVisibility;
    }
  ) {
    if (readOnly) return;
    try {
      const updated = await patchApiMilestoneAttachment(
        workspaceId,
        id,
        patch
      );
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  const showDrop = !readOnly;

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {!compact ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Upload scope docs, references and required deliverables. Default
              visibility is internal until shared.
            </p>
          ) : null}
        </div>
        {milestoneId && loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        {showDrop ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files?.length) {
                void uploadFiles(e.dataTransfer.files);
              }
            }}
          >
            <Upload className="size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              Drag & drop files here, or browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, Office, images, video, ZIP and design assets · max 25 MB each
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={Boolean(busyId)}
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : null}

        {milestoneId ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                className="h-9 pl-8 text-sm"
                placeholder="Search files…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Staged (pre-create) */}
        {staged && staged.length > 0 ? (
          <ul className="space-y-2">
            {staged.map((row, idx) => {
              const Icon = fileIcon(row.file.type, row.file.name);
              return (
                <li
                  key={row.localId}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(row.file.size)} · staged
                        {row.status === "uploading"
                          ? ` · ${row.progress}%`
                          : ""}
                        {row.status === "error" ? ` · ${row.error}` : ""}
                        {row.status === "done" ? " · uploaded" : ""}
                      </p>
                      {!readOnly ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <select
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            value={row.category}
                            onChange={(e) => {
                              const next = [...staged];
                              next[idx] = {
                                ...row,
                                category: e.target
                                  .value as AttachmentCategory,
                              };
                              onStagedChange?.(next);
                            }}
                          >
                            {CATEGORIES.filter(
                              (c) =>
                                c.id !== "developer_submission" &&
                                c.id !== "final_deliverable"
                            ).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            value={row.visibility}
                            onChange={(e) => {
                              const next = [...staged];
                              next[idx] = {
                                ...row,
                                visibility: e.target
                                  .value as AttachmentVisibility,
                              };
                              onStagedChange?.(next);
                            }}
                          >
                            {VISIBILITIES.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                          <Textarea
                            className="sm:col-span-2"
                            rows={2}
                            placeholder="Description (optional)"
                            value={row.description}
                            onChange={(e) => {
                              const next = [...staged];
                              next[idx] = {
                                ...row,
                                description: e.target.value,
                              };
                              onStagedChange?.(next);
                            }}
                          />
                        </div>
                      ) : null}
                      {row.status === "uploading" ? (
                        <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() =>
                          onStagedChange?.(
                            staged.filter((s) => s.localId !== row.localId)
                          )
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {/* Saved attachments */}
        {milestoneId ? (
          filtered.length === 0 && !loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No attachments yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((att) => {
                const Icon = fileIcon(att.mimeType, att.name);
                return (
                  <li
                    key={att.id}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {att.name}
                          </p>
                          <span
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                              visibilityTone(att.visibility)
                            )}
                          >
                            {att.visibility}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {
                              CATEGORIES.find((c) => c.id === att.category)
                                ?.label
                            }
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(att.sizeBytes)}
                          {att.uploadedByName
                            ? ` · ${att.uploadedByName}`
                            : ""}
                        </p>
                        {att.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {att.description}
                          </p>
                        ) : null}
                        {!readOnly && !compact ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              value={att.category}
                              onChange={(e) =>
                                void onPatch(att.id, {
                                  category: e.target
                                    .value as AttachmentCategory,
                                })
                              }
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              value={att.visibility}
                              onChange={(e) =>
                                void onPatch(att.id, {
                                  visibility: e.target
                                    .value as AttachmentVisibility,
                                })
                              }
                            >
                              {VISIBILITIES.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Preview"
                          onClick={() => void onPreview(att)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Download"
                          onClick={() => void onDownload(att.id)}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        {!readOnly ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            disabled={busyId === att.id}
                            onClick={() => void onDelete(att.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </div>

      {previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{previewName}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            {previewName.match(/\.pdf$/i) ? (
              <iframe
                title={previewName}
                src={previewUrl}
                className="h-[70vh] w-full rounded border"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={previewName}
                className="mx-auto max-h-[70vh] max-w-full object-contain"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Upload all staged attachments after milestone create. */
export async function flushStagedMilestoneAttachments(input: {
  workspaceId: string;
  milestoneId: string;
  staged: StagedAttachment[];
  onProgress?: (staged: StagedAttachment[]) => void;
}): Promise<{ uploaded: number; failed: number }> {
  const next = [...input.staged];
  let uploaded = 0;
  let failed = 0;
  for (let i = 0; i < next.length; i++) {
    const row = next[i];
    if (row.status === "done") {
      uploaded += 1;
      continue;
    }
    next[i] = { ...row, status: "uploading", progress: 5 };
    input.onProgress?.([...next]);
    try {
      const remote = await uploadMilestoneAttachmentFile({
        workspaceId: input.workspaceId,
        milestoneId: input.milestoneId,
        file: row.file,
        description: row.description,
        category: row.category,
        visibility: row.visibility,
        onProgress: (pct) => {
          next[i] = { ...next[i], progress: pct };
          input.onProgress?.([...next]);
        },
      });
      next[i] = {
        ...next[i],
        status: "done",
        progress: 100,
        remote,
      };
      uploaded += 1;
      input.onProgress?.([...next]);
    } catch (err) {
      failed += 1;
      next[i] = {
        ...next[i],
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      };
      input.onProgress?.([...next]);
    }
  }
  return { uploaded, failed };
}
