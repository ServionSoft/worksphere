"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  createApiProductionTemplate,
  listApiProductionTemplates,
  type ProductionTemplate,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { useWorkspaceStore } from "@/lib/workspace-store";

const DEFAULT_STAGES = [
  { key: "initiation", label: "Project Initiation", order: 1 },
  { key: "planning", label: "Planning & Estimation", order: 2 },
  { key: "client_approval", label: "Client Approval", order: 3 },
  { key: "resource_allocation", label: "Resource Allocation", order: 4 },
  { key: "production", label: "Production In Progress", order: 5 },
  { key: "qa", label: "Quality Assurance", order: 6 },
  { key: "milestone_submission", label: "Milestone Submission", order: 7 },
  { key: "client_review", label: "Client Review & Approval", order: 8 },
  { key: "final_delivery", label: "Final Delivery", order: 9 },
  { key: "closure", label: "Project Closure", order: 10 },
];

function stageCount(stages: unknown): number {
  return Array.isArray(stages) ? stages.length : 0;
}

export function ProductionTemplatesPanel() {
  const { workspace } = useWorkspaceStore();
  const [templates, setTemplates] = useState<ProductionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!isApiDataSource()) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await listApiProductionTemplates(workspace.id);
      setTemplates(rows);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to load templates"
      );
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createTemplate() {
    if (!code.trim() || !name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    if (!isApiDataSource()) {
      toast.error("Production templates require API mode");
      return;
    }
    setSubmitting(true);
    try {
      await createApiProductionTemplate(workspace.id, {
        code: code.trim().toLowerCase().replace(/\s+/g, "_"),
        name: name.trim(),
        description: description.trim() || undefined,
        stages: DEFAULT_STAGES,
      });
      toast.success("Template created");
      setCode("");
      setName("");
      setDescription("");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to create template"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Production templates"
        description="Lifecycle stages used when creating projects. System templates are shared; workspace templates are tenant-specific."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="agency_web"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agency web delivery"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          New templates start with the default 10-stage software lifecycle.
        </p>
        <div className="mt-3">
          <Button onClick={() => void createTemplate()} disabled={submitting}>
            Create template
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Available templates"
        description={loading ? "Loading…" : `${templates.length} templates`}
      >
        <ul className="divide-y divide-border rounded-lg border border-border">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.code}
                  {t.description ? ` · ${t.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {stageCount(t.stages)} stages
                </Badge>
                {t.isSystem ? (
                  <Badge variant="secondary">System</Badge>
                ) : (
                  <Badge variant="outline">Workspace</Badge>
                )}
              </div>
            </li>
          ))}
          {!loading && templates.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No templates returned. Ensure API mode and membership are active.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}
