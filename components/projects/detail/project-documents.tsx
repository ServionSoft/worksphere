"use client";

import { useRef, useState } from "react";
import { FileText, Link2, Package, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { ApiError } from "@/lib/api/client";
import { isApiDataSource } from "@/lib/data-source";
import { formatRelativeTime } from "@/lib/format";
import {
  openDocumentDownload,
  uploadProjectDocumentFile,
} from "@/lib/supabase/document-storage";
import { useRequiredAuth } from "@/lib/auth-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { DocumentType } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const typeMeta: Record<
  DocumentType,
  { icon: typeof FileText; label: string; tone: string }
> = {
  file: { icon: FileText, label: "File", tone: "bg-sky-50 text-sky-700" },
  deliverable: {
    icon: Package,
    label: "Deliverable",
    tone: "bg-indigo-50 text-indigo-700",
  },
  link: { icon: Link2, label: "Link", tone: "bg-emerald-50 text-emerald-700" },
};

interface ProjectDocumentsProps {
  projectId: string;
}

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const { user } = useRequiredAuth();
  const { workspace, documents, addDocument } = useWorkspaceStore();
  const items = documents.filter((d) => d.projectId === projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    setBusy(true);
    try {
      if (!isApiDataSource()) {
        addDocument({
          projectId,
          name: file.name,
          type: "file",
          sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          uploadedBy: user.name,
          version: "v1.0",
        });
        toast.message("Demo mode — metadata only (no cloud upload)");
        return;
      }

      const uploaded = await uploadProjectDocumentFile({
        workspaceId: workspace.id,
        projectId,
        file,
      });
      addDocument({
        projectId,
        name: file.name,
        type: "file",
        sizeLabel: uploaded.sizeLabel,
        uploadedBy: user.name,
        version: "v1.0",
        url: uploaded.storageUrl,
        storagePath: uploaded.storagePath,
      });
      toast.success("Document uploaded");
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Upload failed"
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleOpen(docId: string, fallbackUrl?: string) {
    if (!isApiDataSource()) {
      if (fallbackUrl?.startsWith("http")) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        return;
      }
      toast.message("Download unavailable in demo mode");
      return;
    }
    try {
      await openDocumentDownload(workspace.id, docId);
    } catch (err) {
      if (fallbackUrl?.startsWith("http")) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        return;
      }
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Download failed"
      );
    }
  }

  return (
    <SectionCard
      title="Documents & deliverables"
      description="Private project library with signed upload/download"
      action={
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </>
      }
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {items.map((doc) => {
          const meta = typeMeta[doc.type];
          const Icon = meta.icon;
          return (
            <li
              key={doc.id}
              className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                    meta.tone
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {meta.label} · {doc.sizeLabel} · {doc.version} ·{" "}
                    {doc.uploadedBy} · {formatRelativeTime(doc.uploadedAt)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleOpen(doc.id, doc.url)}
              >
                Open
              </Button>
            </li>
          );
        })}
        {items.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">
            No documents yet. Upload a deliverable to get started.
          </li>
        ) : null}
      </ul>
    </SectionCard>
  );
}
