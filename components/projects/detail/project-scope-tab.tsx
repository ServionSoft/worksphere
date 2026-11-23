"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/shared/section-card";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Project } from "@/lib/types";
import { toast } from "sonner";

export function ProjectScopeTab({ project }: { project: Project }) {
  const { updateProject } = useWorkspaceStore();
  const [objectives, setObjectives] = useState(project.objectives ?? "");
  const [scopeText, setScopeText] = useState(project.scopeText ?? "");
  const [scopeDocumentId, setScopeDocumentId] = useState(
    project.scopeDocumentId ?? ""
  );
  const [dirty, setDirty] = useState(false);

  function save() {
    updateProject(project.id, {
      objectives,
      scopeText,
      scopeDocumentId: scopeDocumentId.trim() || null,
    });
    setDirty(false);
    toast.success("Scope saved");
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Scope of work"
        description="Original client scope. AI suggestions and approved milestones are managed on the Milestones tab."
        action={
          <Button size="sm" disabled={!dirty} onClick={save}>
            Save scope
          </Button>
        }
      >
        <div className="grid gap-3">
          <div>
            <label className="text-xs font-medium">Objectives</label>
            <Textarea
              className="mt-1"
              rows={3}
              value={objectives}
              onChange={(e) => {
                setObjectives(e.target.value);
                setDirty(true);
              }}
              placeholder="What the client wants to achieve"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Scope text</label>
            <Textarea
              className="mt-1"
              rows={10}
              value={scopeText}
              onChange={(e) => {
                setScopeText(e.target.value);
                setDirty(true);
              }}
              placeholder="Paste the full scope of work here"
            />
          </div>
          <div>
            <label className="text-xs font-medium">
              Scope document ID (from Documents upload)
            </label>
            <Input
              className="mt-1"
              value={scopeDocumentId}
              onChange={(e) => {
                setScopeDocumentId(e.target.value);
                setDirty(true);
              }}
              placeholder="Optional UUID after uploading a PDF/DOCX on Documents"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Upload the scope file on the Documents tab, then paste its document
              id here. Files stay private to the workspace.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="How this differs">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Original scope</strong> — what
            the client provided (this tab).
          </li>
          <li>
            <strong className="text-foreground">AI suggestions</strong> — draft
            milestones with plan status “suggested” until you approve.
          </li>
          <li>
            <strong className="text-foreground">Approved production plan</strong>{" "}
            — milestones you approved, priced, and optionally published.
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}
