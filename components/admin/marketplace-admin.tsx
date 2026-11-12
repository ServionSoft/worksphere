"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Pencil,
  Plus,
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
import {
  formatCurrency,
  formatShortDate,
} from "@/lib/format";
import type {
  ExperienceLevel,
  MarketplaceOpportunity,
  OpportunityPricing,
  OpportunityVisibility,
} from "@/lib/portal-types";
import { useWorkspaceStore } from "@/lib/workspace-store";

type OppForm = {
  title: string;
  summary: string;
  description: string;
  projectId: string;
  pricing: OpportunityPricing;
  budgetMin: string;
  budgetMax: string;
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
  projectId: "",
  pricing: "fixed",
  budgetMin: "1500",
  budgetMax: "1500",
  deadline: "2026-04-15",
  skills: "React, TypeScript",
  visibility: "public",
  experienceLevel: "mid",
  category: "Frontend",
  deliverables: "PR link, Screenshots",
  requirements: "TypeScript, Unit tests",
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OppForm>(emptyOpp);

  const pendingQuotes = quotations.filter((q) => q.status === "pending");
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
      projectId: opp.projectId ?? "",
      pricing: opp.pricing,
      budgetMin: String(opp.budgetMin),
      budgetMax: String(opp.budgetMax),
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

  function publishOpportunity() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
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
    const budgetMin = Number(form.budgetMin) || 0;
    const budgetMax =
      form.pricing === "fixed"
        ? budgetMin
        : Number(form.budgetMax) || budgetMin;

    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim() || form.title.trim(),
      description:
        form.description.trim() ||
        form.summary.trim() ||
        "Marketplace opportunity",
      scope: deliverables,
      requirements,
      skills,
      deliverables,
      category: form.category.trim() || "General",
      pricing: form.pricing,
      budgetMin,
      budgetMax,
      currency: "USD",
      estimatedDays: 7,
      deadline: form.deadline,
      experienceLevel: form.experienceLevel,
      visibility: form.visibility,
      workspaceId: workspace.id,
      projectId: project?.id,
      projectName: project?.name,
      publishedBy: currentUser.name,
      attachments: [] as string[],
    };

    if (editingId) {
      updateOpportunity(editingId, payload);
      setOpportunityStatus(editingId, "open");
      toast.success("Opportunity updated & published");
    } else {
      addOpportunity(payload);
      toast.success("Opportunity published");
    }
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Developer Marketplace"
        description="Publish opportunities, review quotations, and manage assignments."
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
            Quotations
            {pendingQuotes.length > 0 ? (
              <Badge variant="secondary" className="ml-1">
                {pendingQuotes.length}
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
            {opportunities.map((opp) => (
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
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <p>
                    Budget:{" "}
                    {opp.pricing === "fixed"
                      ? formatCurrency(opp.budgetMax, opp.currency)
                      : `${formatCurrency(opp.budgetMin, opp.currency)}–${formatCurrency(opp.budgetMax, opp.currency)}`}
                  </p>
                  <p>Deadline: {formatShortDate(opp.deadline)}</p>
                  <p>Published by {opp.publishedBy}</p>
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
                  {opp.status !== "open" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOpportunityStatus(opp.id, "open");
                        toast.success("Opportunity reopened");
                      }}
                    >
                      Publish / reopen
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
            ))}
            {opportunities.length === 0 ? (
              <SectionCard title="No opportunities">
                <p className="text-sm text-muted-foreground">
                  Create and publish an opportunity to start receiving quotes.
                </p>
              </SectionCard>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="quotations" className="mt-4">
          <div className="flex flex-col gap-3">
            {quotations.map((quote) => {
              const opp = oppById.get(quote.opportunityId);
              return (
                <SectionCard
                  key={quote.id}
                  title={quote.developerName}
                  description={`${opp?.title ?? "Opportunity"} · ${formatCurrency(quote.price)} · ${quote.estimatedDays} days`}
                  action={
                    <Badge variant="outline" className="capitalize">
                      {quote.status}
                    </Badge>
                  }
                >
                  <p className="text-sm text-muted-foreground">
                    {quote.coverMessage}
                  </p>
                  {quote.status === "pending" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          acceptQuotation(quote.id);
                          toast.success("Quotation accepted", {
                            description: "Assignment pending confirmation",
                          });
                        }}
                      >
                        <Check className="size-3.5" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          updateQuotationStatus(quote.id, "rejected");
                          toast.success("Quotation rejected");
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
              <SectionCard title="No quotations">
                <p className="text-sm text-muted-foreground">
                  Quotations from developers will appear here.
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
                description="Confirm or reject assignments created from accepted quotes"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit opportunity" : "Create opportunity"}
            </DialogTitle>
            <DialogDescription>
              Publish to the developer marketplace with pricing and visibility.
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
                    <SelectItem value="quotation">Quotation</SelectItem>
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
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
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
                  label="Deadline"
                  value={form.deadline}
                  onChange={(v) => setForm((p) => ({ ...p, deadline: v }))}
                />
              )}
            </div>
            {form.pricing === "quotation" ? (
              <Field
                label="Deadline"
                value={form.deadline}
                onChange={(v) => setForm((p) => ({ ...p, deadline: v }))}
              />
            ) : null}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={publishOpportunity}>Publish</Button>
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
