"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  flushStagedMilestoneAttachments,
  MilestoneAttachmentsPanel,
} from "@/components/projects/milestone-attachments-panel";
import type { StagedAttachment } from "@/lib/api/milestone-attachments";
import { isApiDataSource } from "@/lib/data-source";
import { demoId } from "@/lib/demo-clock";
import { formatCurrency } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Milestone, Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AddMilestoneDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  title: string;
  description: string;
  deliverables: string;
  startDate: string;
  dueDate: string;
  clientPrice: string;
  developerBudget: string;
  requiredSkills: string;
  estimatedDays: string;
  dependencyIds: string[];
}

function emptyForm(project: Project | null): FormState {
  return {
    title: "",
    description: "",
    deliverables: "",
    startDate: project?.startDate?.slice(0, 10) ?? "",
    dueDate: project?.dueDate?.slice(0, 10) ?? "",
    clientPrice: "0",
    developerBudget: "0",
    requiredSkills: "",
    estimatedDays: "7",
    dependencyIds: [],
  };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function marginPreview(clientPrice: number, developerBudget: number) {
  const margin = Math.round((clientPrice - developerBudget) * 100) / 100;
  const pct =
    clientPrice > 0
      ? Math.round((margin / clientPrice) * 10000) / 100
      : null;
  return { margin, pct };
}

export function AddMilestoneDialog({
  project,
  open,
  onOpenChange,
}: AddMilestoneDialogProps) {
  const { milestones, addMilestone, workspaceId } = useWorkspaceStore();
  const [form, setForm] = useState<FormState>(() => emptyForm(project));
  const [submitting, setSubmitting] = useState<"draft" | "create" | null>(
    null
  );
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [staged, setStaged] = useState<StagedAttachment[]>([]);

  useEffect(() => {
    if (open) {
      setForm(emptyForm(project));
      setStaged([]);
      setAttachmentsOpen(false);
    }
  }, [open, project]);

  const siblings = useMemo(
    () =>
      milestones
        .filter((m) => m.projectId === project?.id)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [milestones, project?.id]
  );

  const planIsDraft = project?.status === "planning";
  const clientPrice = Number(form.clientPrice) || 0;
  const developerBudget = Number(form.developerBudget) || 0;
  const { margin, pct } = marginPreview(clientPrice, developerBudget);

  function toggleDependency(id: string) {
    setForm((prev) => ({
      ...prev,
      dependencyIds: prev.dependencyIds.includes(id)
        ? prev.dependencyIds.filter((x) => x !== id)
        : [...prev.dependencyIds, id],
    }));
  }

  function onStartDateChange(value: string) {
    setForm((prev) => {
      const days = Number(prev.estimatedDays) || 0;
      const nextDue =
        value && days > 0 && !prev.dueDate
          ? addDays(value, days)
          : prev.dueDate;
      return { ...prev, startDate: value, dueDate: nextDue };
    });
  }

  async function submit(mode: "draft" | "create") {
    if (!project) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const planStatus = mode === "draft" || planIsDraft ? "suggested" : "approved";
    const payload: Milestone = {
      id: demoId("ms"),
      projectId: project.id,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || form.startDate || project.dueDate,
      status: "upcoming",
      deliverables: form.deliverables
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      requiredSkills: form.requiredSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dependencyIds: form.dependencyIds,
      estimatedDays: Number(form.estimatedDays) || 7,
      clientPrice,
      developerBudget,
      currency: project.currency || "USD",
      progress: 0,
      planStatus,
      source: "manual",
      commercialStatus:
        clientPrice > 0 || developerBudget > 0 ? "priced" : "unpriced",
      marketplaceStatus: "not_published",
      sortOrder: siblings.length,
    };

    setSubmitting(mode);
    try {
      const created = await addMilestone(payload);
      if (isApiDataSource() && staged.length > 0 && created?.id) {
        const result = await flushStagedMilestoneAttachments({
          workspaceId,
          milestoneId: created.id,
          staged,
          onProgress: setStaged,
        });
        if (result.failed > 0) {
          toast.error(
            `${result.failed} attachment(s) failed — retry from the milestone detail`
          );
        } else if (result.uploaded > 0) {
          toast.success(`${result.uploaded} file(s) uploaded`);
        }
      }
      toast.success(
        mode === "draft" ? "Milestone saved as draft" : "Milestone created",
        {
          description:
            planStatus === "suggested"
              ? "Approve the plan before publishing to marketplace."
              : undefined,
        }
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create milestone");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add milestone</DialogTitle>
          <DialogDescription>
            {project
              ? `Quick-create for ${project.name}. Uses the standard milestone API.`
              : "Select a project first."}
          </DialogDescription>
        </DialogHeader>

        {planIsDraft ? (
          <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-950 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <p>
              This project is still in planning. New milestones stay on the draft
              production plan and cannot be published to the marketplace until
              approved.
            </p>
          </div>
        ) : null}

        <div className="grid gap-3">
          <div>
            <label className="text-xs font-medium">Title</label>
            <Input
              className="mt-1"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="e.g. Discovery & wireframes"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Description</label>
            <Textarea
              className="mt-1"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs font-medium">
              Deliverables (one per line)
            </label>
            <Textarea
              className="mt-1"
              rows={3}
              value={form.deliverables}
              onChange={(e) =>
                setForm((f) => ({ ...f, deliverables: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Start date</label>
              <Input
                className="mt-1"
                type="date"
                value={form.startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Planning aid — deadline is what gets stored.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium">Deadline</label>
              <Input
                className="mt-1"
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Client price</label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={form.clientPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientPrice: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Developer budget</label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={form.developerBudget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, developerBudget: e.target.value }))
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated margin: {formatCurrency(margin, project?.currency)}
            {pct != null ? ` (${pct}%)` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Estimated days</label>
              <Input
                className="mt-1"
                type="number"
                min={1}
                value={form.estimatedDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estimatedDays: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">
                Required skills (comma-separated)
              </label>
              <Input
                className="mt-1"
                value={form.requiredSkills}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requiredSkills: e.target.value }))
                }
                placeholder="React, PostgreSQL"
              />
            </div>
          </div>
          {siblings.length > 0 ? (
            <div>
              <label className="text-xs font-medium">Dependencies</label>
              <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {siblings.map((m) => {
                  const checked = form.dependencyIds.includes(m.id);
                  return (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => toggleDependency(m.id)}
                        />
                        <span>
                          <span className="font-medium text-foreground">
                            {m.title}
                          </span>
                          {m.dueDate ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · due {m.dueDate.slice(0, 10)}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="rounded-lg border border-border">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium"
              onClick={() => setAttachmentsOpen((v) => !v)}
            >
              Scope, Deliverables & Attachments
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  attachmentsOpen && "rotate-180"
                )}
              />
            </button>
            {attachmentsOpen ? (
              <div className="border-t border-border p-2">
                <MilestoneAttachmentsPanel
                  workspaceId={workspaceId}
                  staged={staged}
                  onStagedChange={setStaged}
                  compact
                  title="Attachments"
                />
              </div>
            ) : staged.length > 0 ? (
              <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                {staged.length} file(s) staged for upload after save
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            disabled={!project || submitting !== null}
            onClick={() => void submit("draft")}
          >
            {submitting === "draft" ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Save as draft
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={submitting !== null}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!project || submitting !== null}
              onClick={() => void submit("create")}
            >
              {submitting === "create" ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : null}
              Create milestone
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
