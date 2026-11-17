"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmissionDeliverables } from "@/components/shared/submission-deliverables";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatShortDate } from "@/lib/format";
import { submissionDisplayStatus } from "@/lib/submission-status";
import {
  detectSubmissionStorageMode,
  encodeStorageFileRef,
  resetSubmissionStorageModeCache,
  type StorageMode,
  uploadSubmissionFile,
  type UploadedDeliverable,
} from "@/lib/supabase/submission-storage";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Task } from "@/lib/types";
import { toast } from "sonner";

function isHttpUrl(value: string) {
  return /^https?:\/\/.+/i.test(value.trim());
}

export function TaskSubmitWorkDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, can } = useRequiredAuth();
  const { workSubmissions, addWorkSubmission, workspaceId } =
    useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testingNotes, setTestingNotes] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [urlDeliverables, setUrlDeliverables] = useState("");
  const [uploads, setUploads] = useState<UploadedDeliverable[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode>("unavailable");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const versions = useMemo(() => {
    if (!task) return [];
    return workSubmissions
      .filter((w) => w.taskId === task.id)
      .sort((a, b) => b.version - a.version);
  }, [workSubmissions, task]);

  const latest = versions[0];

  useEffect(() => {
    if (!open || !task) return;
    const nextVersion = (latest?.version ?? 0) + 1;
    setTitle(
      latest?.status === "rejected" ||
        latest?.clientApprovalStatus === "revision_requested"
        ? `${task.title} (v${nextVersion})`
        : task.title
    );
    setDescription("");
    setTestingNotes(
      latest?.revisionNotes || latest?.internalReviewNote
        ? `Addressing: ${latest.revisionNotes || latest.internalReviewNote}`
        : ""
    );
    setRepoUrl("");
    setDeployUrl("");
    setDesignUrl("");
    setUrlDeliverables("");
    setUploads([]);
    setSubmitting(false);
    resetSubmissionStorageModeCache();
    void detectSubmissionStorageMode().then(setStorageMode);
  }, [open, task, latest]);

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length || !task) return;
    if (storageMode !== "supabase") {
      toast.error("File upload is unavailable", {
        description: "Use the URL-based deliverable fields instead.",
      });
      return;
    }
    setUploading(true);
    try {
      const next: UploadedDeliverable[] = [];
      for (const file of Array.from(fileList)) {
        const uploaded = await uploadSubmissionFile({
          file,
          workspaceId,
          taskId: task.id,
        });
        next.push(uploaded);
      }
      setUploads((prev) => [...prev, ...next]);
      toast.success(
        next.length === 1 ? "File uploaded" : `${next.length} files uploaded`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function submit() {
    if (!task) return;
    if (!can("submit_work")) {
      toast.error("You cannot submit work in this role");
      return;
    }
    if (!title.trim()) {
      toast.error("Submission title is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Add a description of completed work");
      return;
    }
    for (const [label, value] of [
      ["Repository URL", repoUrl],
      ["Design URL", designUrl],
      ["Deployment URL", deployUrl],
    ] as const) {
      if (value.trim() && !isHttpUrl(value)) {
        toast.error(`${label} must be a valid http(s) URL`);
        return;
      }
    }

    const urlFiles = urlDeliverables
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const ref of urlFiles) {
      if (!isHttpUrl(ref)) {
        toast.error("Deliverable URLs must start with http:// or https://");
        return;
      }
    }

    const files = [
      ...uploads.map(encodeStorageFileRef),
      ...urlFiles,
    ];

    setSubmitting(true);
    try {
      addWorkSubmission({
        taskId: task.id,
        projectId: task.projectId,
        milestoneId: task.milestoneId ?? undefined,
        title: title.trim(),
        description: description.trim(),
        testingNotes: testingNotes.trim() || undefined,
        repoUrl: repoUrl.trim() || undefined,
        deployUrl: deployUrl.trim() || undefined,
        designUrl: designUrl.trim() || undefined,
        files,
        screenshots: [],
        submittedBy: user.name,
        status: "submitted",
        requiresClientApproval: task.requiresClientApproval !== false,
      });
      toast.success("Submission created", {
        description: "Sent for internal review. Prior versions stay immutable.",
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  const revisionFeedback =
    latest?.revisionNotes || latest?.internalReviewNote || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Submit Work</DialogTitle>
          <DialogDescription>
            {task
              ? `${task.title} · creates submission v${(latest?.version ?? 0) + 1}`
              : "Submit completed work for internal review"}
          </DialogDescription>
        </DialogHeader>

        {revisionFeedback ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-medium">Admin revision feedback</p>
            <p className="mt-1">{revisionFeedback}</p>
          </div>
        ) : null}

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto py-1 pr-1">
          <div className="space-y-1">
            <p className="text-xs font-medium">Submission title</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Submission title"
              required
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Work description</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe completed work (required)"
              className="min-h-24"
              required
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Completion / testing notes</p>
            <Textarea
              value={testingNotes}
              onChange={(e) => setTestingNotes(e.target.value)}
              placeholder="What was tested, remaining risks, handoff notes"
              className="min-h-16"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Repository URL</p>
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/…"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Figma / design URL</p>
            <Input
              value={designUrl}
              onChange={(e) => setDesignUrl(e.target.value)}
              placeholder="https://www.figma.com/…"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">Deployment / live preview URL</p>
            <Input
              value={deployUrl}
              onChange={(e) => setDeployUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-border px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium">File attachments</p>
              {storageMode === "supabase" ? (
                <Badge variant="secondary">Supabase Storage</Badge>
              ) : (
                <Badge variant="outline">URL-based deliverables</Badge>
              )}
            </div>

            {storageMode === "supabase" ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => void onPickFiles(e.target.files)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-3.5" />
                  {uploading ? "Uploading…" : "Upload files"}
                </Button>
                {uploads.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {uploads.map((file) => (
                      <li
                        key={file.path}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                      >
                        <span className="min-w-0 truncate">
                          {file.name}{" "}
                          <span className="text-muted-foreground">
                            ({Math.max(1, Math.round(file.size / 1024))} KB)
                          </span>
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${file.name}`}
                          onClick={() =>
                            setUploads((prev) =>
                              prev.filter((u) => u.path !== file.path)
                            )
                          }
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    PDF, images, zip, and docs up to 10 MB. Uploads are stored in
                    a private bucket and linked to this submission version.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] text-amber-800">
                  Direct file upload is unavailable
                  {storageMode === "unavailable"
                    ? " (Supabase client not configured)."
                    : " (storage bucket not reachable)."}{" "}
                  Paste public deliverable URLs below instead.
                </p>
                <Textarea
                  value={urlDeliverables}
                  onChange={(e) => setUrlDeliverables(e.target.value)}
                  placeholder="https://drive.google.com/… (one URL per line)"
                  className="min-h-16"
                />
              </div>
            )}

            {storageMode === "supabase" ? (
              <div className="space-y-1 border-t border-border pt-2">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Optional additional deliverable URLs
                </p>
                <Textarea
                  value={urlDeliverables}
                  onChange={(e) => setUrlDeliverables(e.target.value)}
                  placeholder="https://… (one URL per line)"
                  className="min-h-14"
                />
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={submitting || uploading}
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskSubmissionHistory({ taskId }: { taskId: string }) {
  const { workSubmissions } = useWorkspaceStore();
  const versions = workSubmissions
    .filter((w) => w.taskId === taskId)
    .sort((a, b) => b.version - a.version);

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No submissions yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {versions.map((v) => {
        const label = submissionDisplayStatus(v);
        return (
          <li
            key={v.id}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium">
                v{v.version} · {v.title}
              </p>
              <Badge variant="outline">{label}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Submitted {formatShortDate(v.submittedAt)}
            </p>
            {(v.revisionNotes || v.internalReviewNote) &&
            (label === "Revision Requested" ||
              v.status === "rejected" ||
              v.status === "approved") ? (
              <p className="mt-1 text-xs text-amber-900">
                Feedback: {v.revisionNotes || v.internalReviewNote}
              </p>
            ) : null}
            <SubmissionDeliverables
              compact
              files={v.files}
              repoUrl={v.repoUrl}
              deployUrl={v.deployUrl}
              designUrl={v.designUrl}
              testingNotes={v.testingNotes}
            />
          </li>
        );
      })}
    </ul>
  );
}
