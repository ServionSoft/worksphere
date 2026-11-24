"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/shared/section-card";
import {
  MilestoneStatusBadge,
  milestoneLabels,
} from "@/components/shared/milestone-badge";
import {
  flushStagedMilestoneAttachments,
  MilestoneAttachmentsPanel,
} from "@/components/projects/milestone-attachments-panel";
import type { StagedAttachment } from "@/lib/api/milestone-attachments";
import { DEMO_NOW_ISO, demoId } from "@/lib/demo-clock";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  approveApiMilestone,
  fetchAiStatus,
  generateApiMilestones,
  publishApiMilestone,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Milestone, MilestoneStatus } from "@/lib/types";
import { toast } from "sonner";

const statuses: MilestoneStatus[] = [
  "upcoming",
  "in_progress",
  "completed",
  "missed",
];

interface ProjectMilestonesProps {
  projectId: string;
}

interface MilestoneFormState {
  title: string;
  description: string;
  publicDescription: string;
  dueDate: string;
  status: MilestoneStatus;
  deliverables: string;
  acceptanceCriteria: string;
  requiredSkills: string;
  estimatedDays: string;
  clientPrice: string;
  developerBudget: string;
  progress: string;
}

const emptyForm: MilestoneFormState = {
  title: "",
  description: "",
  publicDescription: "",
  dueDate: DEMO_NOW_ISO.slice(0, 10),
  status: "upcoming",
  deliverables: "",
  acceptanceCriteria: "",
  requiredSkills: "",
  estimatedDays: "7",
  clientPrice: "0",
  developerBudget: "0",
  progress: "0",
};

function marginPreview(clientPrice: number, developerCost: number) {
  const margin = Math.round((clientPrice - developerCost) * 100) / 100;
  const pct =
    clientPrice > 0
      ? Math.round((margin / clientPrice) * 10000) / 100
      : null;
  return { margin, pct };
}

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const {
    milestones,
    tasks,
    projects,
    workspace,
    quotations,
    opportunities,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    setWorkspaceId,
  } = useWorkspaceStore();

  function reload() {
    if (workspace?.id) setWorkspaceId(workspace.id);
  }
  const project = projects.find((p) => p.id === projectId);
  const items = useMemo(
    () =>
      milestones
        .filter((m) => m.projectId === projectId)
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [milestones, projectId]
  );
  const projectTasks = tasks.filter(
    (t) => t.projectId === projectId && !t.parentId
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [form, setForm] = useState<MilestoneFormState>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [staged, setStaged] = useState<StagedAttachment[]>([]);

  const selected = items.find((m) => m.id === selectedId) ?? items[0] ?? null;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setStaged([]);
    setOpen(true);
  }

  function openEdit(m: Milestone) {
    setEditing(m);
    setStaged([]);
    setForm({
      title: m.title,
      description: m.description,
      publicDescription: m.publicDescription ?? "",
      dueDate: m.dueDate?.slice(0, 10) || DEMO_NOW_ISO.slice(0, 10),
      status: m.status,
      deliverables: m.deliverables.join("\n"),
      acceptanceCriteria: m.acceptanceCriteria ?? "",
      requiredSkills: (m.requiredSkills ?? []).join(", "),
      estimatedDays: String(m.estimatedDays ?? 7),
      clientPrice: String(m.clientPrice ?? 0),
      developerBudget: String(m.developerBudget ?? 0),
      progress: String(m.progress),
    });
    setOpen(true);
  }

  async function saveForm() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const clientPrice = Number(form.clientPrice) || 0;
    const developerBudget = Number(form.developerBudget) || 0;
    const payload: Milestone = {
      id: editing?.id ?? demoId("ms"),
      projectId,
      title: form.title.trim(),
      description: form.description,
      publicDescription: form.publicDescription,
      dueDate: form.dueDate,
      status: form.status,
      deliverables: form.deliverables
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      acceptanceCriteria: form.acceptanceCriteria,
      requiredSkills: form.requiredSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      estimatedDays: Number(form.estimatedDays) || 7,
      clientPrice,
      developerBudget,
      progress: Number(form.progress) || 0,
      planStatus: editing?.planStatus ?? "approved",
      source: editing?.source ?? "manual",
      commercialStatus:
        clientPrice > 0 || developerBudget > 0 ? "priced" : "unpriced",
      marketplaceStatus: editing?.marketplaceStatus ?? "not_published",
    };
    try {
      if (editing) {
        updateMilestone(editing.id, payload);
        toast.success("Milestone updated");
      } else {
        const created = await addMilestone(payload);
        if (isApiDataSource() && staged.length > 0 && created?.id && workspace?.id) {
          const result = await flushStagedMilestoneAttachments({
            workspaceId: workspace.id,
            milestoneId: created.id,
            staged,
            onProgress: setStaged,
          });
          if (result.failed > 0) {
            toast.error(`${result.failed} attachment(s) failed to upload`);
          } else if (result.uploaded > 0) {
            toast.success(`${result.uploaded} file(s) uploaded`);
          }
        }
        toast.success("Milestone created");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save milestone");
    }
  }

  async function onApprove(m: Milestone) {
    if (!isApiDataSource() || !workspace?.id) {
      updateMilestone(m.id, { planStatus: "approved" });
      toast.success("Milestone approved (local)");
      return;
    }
    setBusy(true);
    try {
      const remote = await approveApiMilestone(workspace.id, m.id);
      updateMilestone(m.id, remote);
      toast.success("Milestone approved for production");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublish(m: Milestone) {
    if (!workspace?.id) return;
    if (m.planStatus !== "approved") {
      toast.error("Approve the milestone before publishing");
      return;
    }
    if (!isApiDataSource()) {
      toast.message("Publishing requires API mode");
      return;
    }
    setPublishBusy(true);
    try {
      const result = await publishApiMilestone(workspace.id, m.id, {
        publicDescription: m.publicDescription || m.description,
      });
      updateMilestone(m.id, result.milestone);
      reload();
      toast.success("Published to marketplace", {
        description: `Opportunity ${result.opportunityId.slice(0, 8)}…`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishBusy(false);
    }
  }

  async function onGenerateAi() {
    if (!workspace?.id) return;
    setAiBusy(true);
    try {
      const status = await fetchAiStatus();
      if (status.milestoneGeneration !== "available") {
        toast.error("AI unavailable", {
          description:
            "Configure OPENAI_API_KEY on the API server, or create milestones manually.",
        });
        return;
      }
      const result = await generateApiMilestones(workspace.id, projectId, {
        scopeText: project?.scopeText,
      });
      reload();
      toast.success(
        `${result.milestones?.length ?? result.suggestions.length} suggested milestones ready for review`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setAiBusy(false);
    }
  }

  const selectedBids = useMemo(() => {
    if (!selected?.opportunityId) return [];
    return quotations.filter((q) => q.opportunityId === selected.opportunityId);
  }, [quotations, selected?.opportunityId]);

  const clientPrice = Number(selected?.clientPrice ?? 0);
  const developerBudget = Number(selected?.developerBudget ?? 0);
  const awarded = selected?.awardedDeveloperCost;
  const cost = awarded != null ? awarded : developerBudget;
  const { margin, pct } = marginPreview(clientPrice, cost);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <SectionCard
        title="Milestones"
        description="Independent production + commercial units. Approve before publishing."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={aiBusy}
              onClick={() => void onGenerateAi()}
            >
              {aiBusy ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              Generate from scope
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Add
            </Button>
          </div>
        }
        bodyClassName="p-0"
      >
        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No milestones yet. Paste scope on the Scope tab, generate with AI when
            configured, or add manually.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((m) => {
              const linkedTasks = projectTasks.filter(
                (t) => t.milestoneId === m.id
              );
              const active = selected?.id === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors sm:px-5 ${
                      active ? "bg-muted/50" : "hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedId(m.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{m.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {m.description || "No description"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <MilestoneStatusBadge status={m.status} />
                        <Badge variant="secondary">
                          {(m.planStatus ?? "approved").replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline">
                          {(m.marketplaceStatus ?? "not_published").replace(
                            /_/g,
                            " "
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        Client{" "}
                        {formatCurrency(m.clientPrice ?? 0, m.currency ?? "USD")}
                      </span>
                      <span>
                        Dev budget{" "}
                        {formatCurrency(
                          m.developerBudget ?? 0,
                          m.currency ?? "USD"
                        )}
                      </span>
                      <span>
                        {linkedTasks.length} task
                        {linkedTasks.length === 1 ? "" : "s"}
                      </span>
                      {m.dueDate ? (
                        <span>Due {formatDate(m.dueDate)}</span>
                      ) : null}
                    </div>
                    <Progress value={m.progress} className="h-1.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <div className="space-y-4">
        {!selected ? (
          <SectionCard title="Milestone detail">
            <p className="text-sm text-muted-foreground">
              Select a milestone to manage pricing, marketplace, and bids.
            </p>
          </SectionCard>
        ) : (
          <>
            <SectionCard
              title={selected.title}
              description={`${milestoneLabels[selected.status]} · ${selected.commercialStatus ?? "unpriced"} · ${selected.marketplaceStatus ?? "not_published"}`}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(selected)}
                  >
                    <Pencil data-icon="inline-start" />
                    Edit
                  </Button>
                  {selected.planStatus === "suggested" ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void onApprove(selected)}
                    >
                      <CheckCircle2 data-icon="inline-start" />
                      Approve
                    </Button>
                  ) : null}
                  {selected.planStatus === "approved" &&
                  selected.marketplaceStatus !== "published" &&
                  selected.marketplaceStatus !== "filled" ? (
                    <Button
                      size="sm"
                      disabled={publishBusy}
                      onClick={() => void onPublish(selected)}
                    >
                      <Store data-icon="inline-start" />
                      {publishBusy ? "Publishing…" : "Publish"}
                    </Button>
                  ) : null}
                  {selected.opportunityId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <Link
                          href={`/marketplace?tab=bids&opportunityId=${selected.opportunityId}`}
                        />
                      }
                      nativeButton={false}
                    >
                      Open bids
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      deleteMilestone(selected.id);
                      toast.success("Milestone removed");
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Client price</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(clientPrice, selected.currency ?? "USD")}
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    Developer budget (original)
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(
                      developerBudget,
                      selected.currency ?? "USD"
                    )}
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    Awarded developer cost
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {awarded != null
                      ? formatCurrency(awarded, selected.currency ?? "USD")
                      : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Gross margin</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(margin, selected.currency ?? "USD")}
                    {pct != null ? ` (${pct}%)` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Original budget is never overwritten by award. Awarded cost is set
                only when a bid is accepted.
              </p>
              {selected.acceptanceCriteria ? (
                <div className="mt-4">
                  <p className="text-xs font-medium">Acceptance criteria</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {selected.acceptanceCriteria}
                  </p>
                </div>
              ) : null}
              {(selected.requiredSkills?.length ?? 0) > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.requiredSkills!.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Bids"
              description={
                selected.opportunityId
                  ? "Proposals for this milestone opportunity"
                  : "Publish to marketplace to collect bids"
              }
              bodyClassName="p-0"
            >
              {selectedBids.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No bids yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {selectedBids.map((q) => (
                    <li
                      key={q.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
                    >
                      <div>
                        <p className="text-sm font-medium">{q.developerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(q.price)} · {q.estimatedDays} days ·{" "}
                          {q.status}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link
                            href={`/marketplace?tab=bids&opportunityId=${q.opportunityId}`}
                          />
                        }
                        nativeButton={false}
                      >
                        Compare
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Linked opportunity">
              {selected.opportunityId ? (
                <p className="text-sm">
                  {opportunities.find((o) => o.id === selected.opportunityId)
                    ?.title ?? "Opportunity"}{" "}
                  <span className="text-muted-foreground">
                    ({selected.opportunityId.slice(0, 8)}…)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not published.</p>
              )}
            </SectionCard>

            {workspace?.id ? (
              <MilestoneAttachmentsPanel
                workspaceId={workspace.id}
                milestoneId={selected.id}
              />
            ) : null}
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit milestone" : "New milestone"}
            </DialogTitle>
            <DialogDescription>
              Set production details and independent client / developer amounts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium">Title</label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">Internal description</label>
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
                Public marketplace description
              </label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.publicDescription}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    publicDescription: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Client price</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
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
                  value={form.developerBudget}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      developerBudget: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {(() => {
              const cp = Number(form.clientPrice) || 0;
              const db = Number(form.developerBudget) || 0;
              const m = marginPreview(cp, db);
              return (
                <p className="text-xs text-muted-foreground">
                  Estimated margin: {formatCurrency(m.margin)}
                  {m.pct != null ? ` (${m.pct}%)` : " — set client price to compute %"}
                </p>
              );
            })()}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Due date</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </div>
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
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  typeof v === "string" &&
                  setForm((f) => ({ ...f, status: v as MilestoneStatus }))
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {milestoneLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div>
              <label className="text-xs font-medium">Acceptance criteria</label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.acceptanceCriteria}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    acceptanceCriteria: e.target.value,
                  }))
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
              />
            </div>
            {workspace?.id ? (
              <MilestoneAttachmentsPanel
                workspaceId={workspace.id}
                milestoneId={editing?.id}
                staged={editing ? undefined : staged}
                onStagedChange={editing ? undefined : setStaged}
                compact
                title="Scope, Deliverables & Attachments"
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveForm()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
