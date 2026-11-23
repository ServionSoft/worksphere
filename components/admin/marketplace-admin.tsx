"use client";

import { useMemo, useState } from "react";
import {
  Check,
  GitCompare,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { currentUser } from "@/lib/mock-data";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type {
  ExperienceLevel,
  MarketplaceOpportunity,
  OpportunityPricing,
  OpportunityVisibility,
  Quotation,
} from "@/lib/portal-types";
import { useWorkspaceStore } from "@/lib/workspace-store";

type OppForm = {
  title: string;
  summary: string;
  description: string;
  objectives: string;
  scope: string;
  projectId: string;
  pricing: OpportunityPricing;
  budgetMin: string;
  budgetMax: string;
  estimatedDays: string;
  deadline: string;
  skills: string;
  visibility: OpportunityVisibility;
  experienceLevel: ExperienceLevel;
  category: string;
  deliverables: string;
  requirements: string;
};

const emptyOpp: OppForm = {
  title: "",
  summary: "",
  description: "",
  objectives: "",
  scope: "",
  projectId: "",
  pricing: "quotation",
  budgetMin: "1500",
  budgetMax: "4500",
  estimatedDays: "14",
  deadline: "2026-04-15",
  skills: "React, TypeScript",
  visibility: "public",
  experienceLevel: "mid",
  category: "Frontend",
  deliverables: "PR link, Screenshots",
  requirements: "TypeScript, Unit tests",
};

function daysUntil(deadline: string) {
  const end = new Date(deadline).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

export function MarketplaceAdmin() {
  const {
    opportunities,
    quotations,
    assignments,
    projects,
    workspace,
    addOpportunity,
    updateOpportunity,
    setOpportunityStatus,
    deleteOpportunity,
    acceptQuotation,
    updateQuotationStatus,
    confirmAssignment,
    rejectAssignment,
    resolveExtension,
  } = useWorkspaceStore();

  const [tab, setTab] = useState("opportunities");
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OppForm>(emptyOpp);
  const [compareOppId, setCompareOppId] = useState<string | null>(null);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [awardTarget, setAwardTarget] = useState<Quotation | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvedDays, setApprovedDays] = useState("");
  const [awardNote, setAwardNote] = useState("");

  const actionableBids = quotations.filter((q) =>
    ["pending", "shortlisted"].includes(q.status)
  );
  const pendingAssignments = assignments.filter(
    (a) => a.status === "pending_confirmation"
  );
  const extensionRequests = assignments.filter(
    (a) => a.extensionRequest?.status === "pending"
  );

  const oppById = useMemo(() => {
    const map = new Map<string, MarketplaceOpportunity>();
    opportunities.forEach((o) => map.set(o.id, o));
    return map;
  }, [opportunities]);

  const bidsByOpportunity = useMemo(() => {
    const map = new Map<string, Quotation[]>();
    quotations.forEach((q) => {
      const list = map.get(q.opportunityId) ?? [];
      list.push(q);
      map.set(q.opportunityId, list);
    });
    return map;
  }, [quotations]);

  const compareOpp = compareOppId ? oppById.get(compareOppId) : null;
  const compareBids = compareOppId
    ? (bidsByOpportunity.get(compareOppId) ?? []).slice().sort((a, b) => {
        const order = {
          shortlisted: 0,
          pending: 1,
          accepted: 2,
          rejected: 3,
          withdrawn: 4,
        } as Record<string, number>;
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      })
    : [];

  function buildPayload(status: "draft" | "open") {
    const project = projects.find((p) => p.id === form.projectId);
    const skills = form.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const deliverables = form.deliverables
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const requirements = form.requirements
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const scope = form.scope
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const budgetMin = Number(form.budgetMin) || 0;
    const budgetMax =
      form.pricing === "fixed"
        ? budgetMin
        : Number(form.budgetMax) || budgetMin;
    const descriptionParts = [
      form.description.trim(),
      form.objectives.trim()
        ? `Objectives:\n${form.objectives.trim()}`
        : "",
    ].filter(Boolean);

    return {
      title: form.title.trim(),
      summary: form.summary.trim() || form.title.trim(),
      description:
        descriptionParts.join("\n\n") ||
        form.summary.trim() ||
        "Marketplace opportunity",
      scope: scope.length > 0 ? scope : deliverables,
      requirements,
      skills,
      deliverables,
      category: form.category.trim() || "General",
      pricing: form.pricing,
      budgetMin,
      budgetMax,
      currency: "USD",
      estimatedDays: Number(form.estimatedDays) || 7,
      deadline: form.deadline,
      experienceLevel: form.experienceLevel,
      visibility: form.visibility,
      workspaceId: workspace.id,
      projectId: project?.id,
      projectName: project?.name,
      publishedBy: currentUser.name,
      attachments: [] as string[],
      status,
    };
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyOpp,
      projectId: projects[0]?.id ?? "",
    });
    setOpen(true);
  }

  function openEdit(opp: MarketplaceOpportunity) {
    setEditingId(opp.id);
    setForm({
      title: opp.title,
      summary: opp.summary,
      description: opp.description,
      objectives: "",
      scope: opp.scope.join("\n"),
      projectId: opp.projectId ?? "",
      pricing: opp.pricing,
      budgetMin: String(opp.budgetMin),
      budgetMax: String(opp.budgetMax),
      estimatedDays: String(opp.estimatedDays),
      deadline: opp.deadline,
      skills: opp.skills.join(", "),
      visibility: opp.visibility,
      experienceLevel: opp.experienceLevel,
      category: opp.category,
      deliverables: opp.deliverables.join(", "),
      requirements: opp.requirements.join(", "),
    });
    setOpen(true);
  }

  function saveOpportunity(status: "draft" | "open") {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = buildPayload(status);
    if (editingId) {
      updateOpportunity(editingId, payload);
      setOpportunityStatus(editingId, status);
      toast.success(
        status === "draft" ? "Draft saved" : "Opportunity published"
      );
    } else {
      addOpportunity(payload);
      toast.success(
        status === "draft" ? "Draft saved" : "Opportunity published"
      );
    }
    setOpen(false);
    setPreviewOpen(false);
  }

  function openCompare(opportunityId: string) {
    setCompareOppId(opportunityId);
    setSelectedQuoteIds([]);
    setTab("quotations");
  }

  function toggleCompareSelect(id: string) {
    setSelectedQuoteIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id]
    );
  }

  function openAward(quote: Quotation) {
    setAwardTarget(quote);
    setApprovedAmount(String(quote.price));
    setApprovedDays(String(quote.estimatedDays));
    setAwardNote("");
  }

  function confirmAward() {
    if (!awardTarget) return;
    acceptQuotation(awardTarget.id, {
      approvedAmount: Number(approvedAmount) || awardTarget.price,
      approvedDays: Number(approvedDays) || awardTarget.estimatedDays,
      note: awardNote.trim() || undefined,
    });
    toast.success("Project awarded", {
      description: "Assignment pending developer confirmation",
    });
    setAwardTarget(null);
  }

  const selectedForCompare = compareBids.filter((q) =>
    selectedQuoteIds.includes(q.id)
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Developer Marketplace"
        description="Publish opportunities, compare bids, and award projects."
        actions={
          tab === "opportunities" ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              New opportunity
            </Button>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => typeof v === "string" && setTab(v)}
      >
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="quotations">
            Bids
            {actionableBids.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {actionableBids.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments
            {pendingAssignments.length + extensionRequests.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {pendingAssignments.length + extensionRequests.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-4">
          <div className="flex flex-col gap-3">
            {opportunities.map((opp) => {
              const bids = bidsByOpportunity.get(opp.id) ?? [];
              const remaining = daysUntil(opp.deadline);
              return (
                <SectionCard
                  key={opp.id}
                  title={opp.title}
                  description={`${opp.projectName ?? "No project"} · ${opp.pricing} · ${opp.visibility}`}
                  action={
                    <Badge variant="outline" className="capitalize">
                      {opp.status}
                    </Badge>
                  }
                >
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                    <p>
                      Budget:{" "}
                      {opp.pricing === "fixed"
                        ? formatCurrency(opp.budgetMax, opp.currency)
                        : `${formatCurrency(opp.budgetMin, opp.currency)}–${formatCurrency(opp.budgetMax, opp.currency)}`}
                    </p>
                    <p>Deadline: {formatShortDate(opp.deadline)}</p>
                    <p>
                      Bids: {bids.length}
                      {bids.filter((b) => b.status === "pending").length > 0
                        ? ` · ${bids.filter((b) => b.status === "pending").length} new`
                        : ""}
                    </p>
                    <p>
                      {remaining == null
                        ? "—"
                        : remaining < 0
                          ? "Deadline passed"
                          : `${remaining}d remaining`}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {opp.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(opp)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    {bids.length > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCompare(opp.id)}
                      >
                        <GitCompare className="size-3.5" />
                        Manage bids ({bids.length})
                      </Button>
                    ) : null}
                    {opp.status === "draft" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setOpportunityStatus(opp.id, "open");
                          toast.success("Opportunity published");
                        }}
                      >
                        Publish
                      </Button>
                    ) : opp.status !== "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOpportunityStatus(opp.id, "open");
                          toast.success("Opportunity reopened");
                        }}
                      >
                        Reopen
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOpportunityStatus(opp.id, "closed");
                          toast.success("Opportunity closed");
                        }}
                      >
                        Close
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        deleteOpportunity(opp.id);
                        toast.success("Opportunity deleted");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </SectionCard>
              );
            })}
            {opportunities.length === 0 ? (
              <SectionCard title="No opportunities">
                <p className="text-sm text-muted-foreground">
                  Create and publish an opportunity to start receiving bids.
                </p>
              </SectionCard>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="quotations" className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Filter by opportunity
            </label>
            <Select
              value={compareOppId ?? "all"}
              onValueChange={(v) =>
                typeof v === "string" &&
                setCompareOppId(v === "all" ? null : v)
              }
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="All opportunities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All opportunities</SelectItem>
                {opportunities.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {compareOpp ? (
            <SectionCard
              title={`Bid comparison · ${compareOpp.title}`}
              description={`${compareBids.length} bids · Budget ${formatCurrency(compareOpp.budgetMin)}–${formatCurrency(compareOpp.budgetMax)} · Deadline ${formatShortDate(compareOpp.deadline)}`}
              className="mb-4"
            >
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  Pending:{" "}
                  {compareBids.filter((b) => b.status === "pending").length}
                </span>
                <span>
                  Shortlisted:{" "}
                  {compareBids.filter((b) => b.status === "shortlisted").length}
                </span>
                <span>
                  Accepted:{" "}
                  {compareBids.filter((b) => b.status === "accepted").length}
                </span>
                <span>
                  Rejected:{" "}
                  {compareBids.filter((b) => b.status === "rejected").length}
                </span>
              </div>

              {selectedForCompare.length >= 2 ? (
                <div className="mb-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 font-medium">Criteria</th>
                        {selectedForCompare.map((q) => (
                          <th key={q.id} className="px-3 py-2 font-medium">
                            {q.developerName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">
                          Price
                        </td>
                        {selectedForCompare.map((q) => (
                          <td key={q.id} className="px-3 py-2 font-medium">
                            {formatCurrency(q.price)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">
                          Timeline
                        </td>
                        {selectedForCompare.map((q) => (
                          <td key={q.id} className="px-3 py-2">
                            {q.estimatedDays} days
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">
                          Status
                        </td>
                        {selectedForCompare.map((q) => (
                          <td key={q.id} className="px-3 py-2 capitalize">
                            {q.status}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-muted-foreground">
                          Rating
                        </td>
                        {selectedForCompare.map((q) => (
                          <td key={q.id} className="px-3 py-2">
                            {q.developerRating != null
                              ? q.developerRating.toFixed(1)
                              : "—"}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mb-3 text-xs text-muted-foreground">
                  Select 2–3 bids below to compare side by side.
                </p>
              )}
            </SectionCard>
          ) : null}

          <div className="flex flex-col gap-3">
            {(compareOppId
              ? compareBids
              : quotations.slice().sort((a, b) =>
                  b.submittedAt.localeCompare(a.submittedAt)
                )
            ).map((quote) => {
              const opp = oppById.get(quote.opportunityId);
              const canAct = ["pending", "shortlisted"].includes(quote.status);
              const selected = selectedQuoteIds.includes(quote.id);
              return (
                <SectionCard
                  key={quote.id}
                  title={quote.developerName}
                  description={`${opp?.title ?? "Opportunity"} · ${formatCurrency(quote.price)} · ${quote.estimatedDays} days · ${formatShortDate(quote.submittedAt)}`}
                  action={
                    <div className="flex items-center gap-2">
                      {compareOppId ? (
                        <Button
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          onClick={() => toggleCompareSelect(quote.id)}
                        >
                          {selected ? "Selected" : "Compare"}
                        </Button>
                      ) : null}
                      <Badge variant="outline" className="capitalize">
                        {quote.status}
                      </Badge>
                    </div>
                  }
                >
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Cover letter
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {quote.coverMessage}
                      </p>
                      {quote.understanding ? (
                        <>
                          <p className="mt-3 text-xs font-medium text-muted-foreground">
                            Understanding
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {quote.understanding}
                          </p>
                        </>
                      ) : null}
                      {quote.approach ? (
                        <>
                          <p className="mt-3 text-xs font-medium text-muted-foreground">
                            Approach
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {quote.approach}
                          </p>
                        </>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Developer
                      </p>
                      <p className="mt-1">
                        {quote.developerTitle || "Developer"}
                        {quote.developerStatus
                          ? ` · ${quote.developerStatus}`
                          : ""}
                      </p>
                      {quote.developerSkills &&
                      quote.developerSkills.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {quote.developerSkills.map((s) => (
                            <Badge key={s} variant="secondary">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {quote.relevantExperience ? (
                        <>
                          <p className="mt-3 text-xs font-medium text-muted-foreground">
                            Relevant experience
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {quote.relevantExperience}
                          </p>
                        </>
                      ) : null}
                      {quote.portfolioLinks &&
                      quote.portfolioLinks.length > 0 ? (
                        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-primary">
                          {quote.portfolioLinks.map((link) => (
                            <li key={link}>
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="underline-offset-2 hover:underline"
                              >
                                {link}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {quote.rejectionReason ? (
                        <p className="mt-3 text-xs text-destructive">
                          Feedback: {quote.rejectionReason}
                        </p>
                      ) : null}
                      {quote.adminNotes ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Notes: {quote.adminNotes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {canAct ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quote.status !== "shortlisted" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateQuotationStatus(quote.id, "shortlisted");
                            toast.success("Developer shortlisted");
                          }}
                        >
                          <Star className="size-3.5" />
                          Shortlist
                        </Button>
                      ) : null}
                      <Button size="sm" onClick={() => openAward(quote)}>
                        <Check className="size-3.5" />
                        Award project
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRejectTarget(quote);
                          setRejectReason("");
                        }}
                      >
                        <X className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </SectionCard>
              );
            })}
            {quotations.length === 0 ? (
              <SectionCard title="No bids yet">
                <p className="text-sm text-muted-foreground">
                  Bids from developers will appear here for comparison and award.
                </p>
              </SectionCard>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <div className="flex flex-col gap-3">
            {pendingAssignments.length > 0 ? (
              <SectionCard
                title="Pending confirmation"
                description="Confirm or reject assignments created from awarded bids"
              >
                <div className="flex flex-col gap-3">
                  {pendingAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-lg border border-border px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.developerName} ·{" "}
                            {formatCurrency(
                              assignment.budget,
                              assignment.currency
                            )}{" "}
                            · due {formatShortDate(assignment.deadline)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              confirmAssignment(assignment.id);
                              toast.success("Assignment confirmed");
                            }}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              rejectAssignment(assignment.id);
                              toast.success("Assignment rejected");
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {extensionRequests.length > 0 ? (
              <SectionCard
                title="Extension requests"
                description="Approve or reject deadline changes"
              >
                <div className="flex flex-col gap-3">
                  {extensionRequests.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-lg border border-border px-3 py-3"
                    >
                      <p className="font-medium">{assignment.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {assignment.developerName} requests{" "}
                        {formatShortDate(
                          assignment.extensionRequest!.requestedDeadline
                        )}
                      </p>
                      <p className="mt-1 text-sm">
                        {assignment.extensionRequest!.reason}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            resolveExtension(assignment.id, "approved");
                            toast.success("Extension approved");
                          }}
                        >
                          Approve extension
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            resolveExtension(assignment.id, "rejected");
                            toast.success("Extension rejected");
                          }}
                        >
                          Reject extension
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="All assignments"
              description={`${assignments.length} total`}
              bodyClassName="p-0"
            >
              <div className="divide-y divide-border">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
                  >
                    <div>
                      <p className="text-sm font-medium">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.developerName} ·{" "}
                        {assignment.projectName ?? "No project"} ·{" "}
                        {formatShortDate(assignment.deadline)}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {assignment.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                ))}
                {assignments.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No assignments yet.
                  </p>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit opportunity" : "Publish opportunity"}
            </DialogTitle>
            <DialogDescription>
              Define scope, commercials, and visibility. Preview before
              publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field
              label="Title"
              value={form.title}
              onChange={(v) => setForm((p) => ({ ...p, title: v }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Project</label>
              <Select
                value={form.projectId || undefined}
                onValueChange={(v) =>
                  typeof v === "string" &&
                  setForm((p) => ({ ...p, projectId: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Pricing</label>
                <Select
                  value={form.pricing}
                  onValueChange={(v) =>
                    typeof v === "string" &&
                    setForm((p) => ({
                      ...p,
                      pricing: v as OpportunityPricing,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="quotation">Quotation / bidding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Visibility</label>
                <Select
                  value={form.visibility}
                  onValueChange={(v) =>
                    typeof v === "string" &&
                    setForm((p) => ({
                      ...p,
                      visibility: v as OpportunityVisibility,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public marketplace</SelectItem>
                    <SelectItem value="private">Invitation only</SelectItem>
                    <SelectItem value="direct">Direct assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={form.pricing === "fixed" ? "Budget" : "Budget min"}
                value={form.budgetMin}
                onChange={(v) => setForm((p) => ({ ...p, budgetMin: v }))}
              />
              {form.pricing === "quotation" ? (
                <Field
                  label="Budget max"
                  value={form.budgetMax}
                  onChange={(v) => setForm((p) => ({ ...p, budgetMax: v }))}
                />
              ) : (
                <Field
                  label="Estimated days"
                  value={form.estimatedDays}
                  onChange={(v) =>
                    setForm((p) => ({ ...p, estimatedDays: v }))
                  }
                />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Bid / delivery deadline"
                value={form.deadline}
                onChange={(v) => setForm((p) => ({ ...p, deadline: v }))}
              />
              {form.pricing === "quotation" ? (
                <Field
                  label="Estimated days"
                  value={form.estimatedDays}
                  onChange={(v) =>
                    setForm((p) => ({ ...p, estimatedDays: v }))
                  }
                />
              ) : null}
            </div>
            <Field
              label="Skills (comma-separated)"
              value={form.skills}
              onChange={(v) => setForm((p) => ({ ...p, skills: v }))}
            />
            <Field
              label="Category"
              value={form.category}
              onChange={(v) => setForm((p) => ({ ...p, category: v }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Experience</label>
              <Select
                value={form.experienceLevel}
                onValueChange={(v) =>
                  typeof v === "string" &&
                  setForm((p) => ({
                    ...p,
                    experienceLevel: v as ExperienceLevel,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid">Mid</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field
              label="Summary"
              value={form.summary}
              onChange={(v) => setForm((p) => ({ ...p, summary: v }))}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Objectives</label>
              <Textarea
                value={form.objectives}
                onChange={(e) =>
                  setForm((p) => ({ ...p, objectives: e.target.value }))
                }
                placeholder="What success looks like"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Scope of work (one item per line)
              </label>
              <Textarea
                value={form.scope}
                onChange={(e) =>
                  setForm((p) => ({ ...p, scope: e.target.value }))
                }
              />
            </div>
            <Field
              label="Deliverables (comma-separated)"
              value={form.deliverables}
              onChange={(v) => setForm((p) => ({ ...p, deliverables: v }))}
            />
            <Field
              label="Requirements (comma-separated)"
              value={form.requirements}
              onChange={(v) => setForm((p) => ({ ...p, requirements: v }))}
            />
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              Preview
            </Button>
            <Button variant="secondary" onClick={() => saveOpportunity("draft")}>
              Save draft
            </Button>
            <Button onClick={() => saveOpportunity("open")}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview opportunity</DialogTitle>
            <DialogDescription>
              How this will appear to eligible developers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-lg font-semibold">{form.title || "Untitled"}</p>
            <p className="text-muted-foreground">
              {form.summary || "No summary"}
            </p>
            <p>
              {form.pricing === "fixed"
                ? formatCurrency(Number(form.budgetMin) || 0)
                : `${formatCurrency(Number(form.budgetMin) || 0)}–${formatCurrency(Number(form.budgetMax) || 0)}`}{" "}
              · {form.estimatedDays || "—"} days · Due {form.deadline}
            </p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {form.description}
            </p>
            {form.objectives ? (
              <div>
                <p className="font-medium">Objectives</p>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {form.objectives}
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Back
            </Button>
            <Button onClick={() => saveOpportunity("open")}>
              Confirm & publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject bid</DialogTitle>
            <DialogDescription>
              Optionally share feedback with {rejectTarget?.developerName}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection feedback (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectTarget) return;
                updateQuotationStatus(rejectTarget.id, "rejected", {
                  rejectionReason: rejectReason.trim() || undefined,
                });
                toast.success("Bid rejected");
                setRejectTarget(null);
              }}
            >
              Reject bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!awardTarget}
        onOpenChange={(v) => !v && setAwardTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm award</DialogTitle>
            <DialogDescription>
              Awarding locks commercial terms and closes this opportunity to new
              bids. Only one developer can win.
            </DialogDescription>
          </DialogHeader>
          {awardTarget ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Developer:</span>{" "}
                {awardTarget.developerName}
              </p>
              <p>
                <span className="text-muted-foreground">Opportunity:</span>{" "}
                {oppById.get(awardTarget.opportunityId)?.title}
              </p>
              <p>
                <span className="text-muted-foreground">Proposed:</span>{" "}
                {formatCurrency(awardTarget.price)} · {awardTarget.estimatedDays}{" "}
                days
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Approved amount"
                  value={approvedAmount}
                  onChange={setApprovedAmount}
                />
                <Field
                  label="Approved days"
                  value={approvedDays}
                  onChange={setApprovedDays}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Award note</label>
                <Textarea
                  value={awardNote}
                  onChange={(e) => setAwardNote(e.target.value)}
                  placeholder="Optional note for audit / developer"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAwardTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmAward}>Approve & award</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
