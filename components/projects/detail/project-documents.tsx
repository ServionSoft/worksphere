"use client";

import { FileText, Link2, Package, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { formatRelativeTime } from "@/lib/format";
import { demoId } from "@/lib/demo-clock";
import { currentUser } from "@/lib/mock-data";
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
  const { documents, addDocument } = useWorkspaceStore();
  const items = documents.filter((d) => d.projectId === projectId);

  function handleUpload() {
    addDocument({
      projectId,
      name: `Upload-${demoId("f")}.pdf`,
      type: "file",
      sizeLabel: "1.2 MB",
      uploadedBy: currentUser.name,
      version: "v1.0",
    });
    toast.success("Document added", {
      description: "Mock upload saved to the project library.",
    });
  }

  return (
    <SectionCard
      title="Documents & deliverables"
      description="Files, links and submission assets"
      action={
        <Button size="sm" onClick={handleUpload}>
          <Upload data-icon="inline-start" />
          Upload
        </Button>
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
                onClick={() =>
                  toast.message(doc.name, {
                    description: doc.url ?? "Preview opens when backend is connected.",
                  })
                }
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
