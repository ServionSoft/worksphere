"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { ApiError } from "@/lib/api/client";
import { useRequiredAuth } from "@/lib/auth-store";
import { isApiDataSource } from "@/lib/data-source";
import { formatShortDate } from "@/lib/format";
import { clientDocuments, clientProjects } from "@/lib/portal-selectors";
import {
  openDocumentDownload,
  uploadProjectDocumentFile,
} from "@/lib/supabase/document-storage";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

/** Client documents library with real signed upload/download when API mode is on. */
export function ClientDocumentsPanel() {
  const { user } = useRequiredAuth();
  const { workspace, projects, documents, addDocument } = useWorkspaceStore();
  const ids = clientProjects(projects, user).map((p) => p.id);
  const docs = clientDocuments(documents, ids);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !ids[0]) {
      toast.error("No project available for upload");
      return;
    }
    const file = files[0];
    setBusy(true);
    try {
      if (!isApiDataSource()) {
        toast.error("Document upload requires API mode");
        return;
      }
      const uploaded = await uploadProjectDocumentFile({
        workspaceId: workspace.id,
        projectId: ids[0],
        file,
      });
      addDocument({
        projectId: ids[0],
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Documents"
        description="Contracts, specs, deliverables and reports for your projects."
        actions={
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleUpload(e.target.files)}
            />
            <Button
              size="sm"
              disabled={busy || ids.length === 0}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </>
        }
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents..."
        className="max-w-sm"
      />
      <SectionCard title="Library" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {filtered.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.type} · {doc.version} · {doc.uploadedBy} ·{" "}
                  {formatShortDate(doc.uploadedAt)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void openDocumentDownload(workspace.id, doc.id).catch(
                    (err) =>
                      toast.error(
                        err instanceof Error ? err.message : "Download failed"
                      )
                  );
                }}
              >
                Download
              </Button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              No documents yet.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}
