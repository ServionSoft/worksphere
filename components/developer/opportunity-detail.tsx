"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/shared/section-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listApiMessagingRecipients } from "@/lib/api/workspace-api";
import { useRequiredAuth } from "@/lib/auth-store";
import { isApiDataSource } from "@/lib/data-source";
import { formatCurrency, formatDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

type BidStep = 1 | 2 | 3;

export function OpportunityDetailPage({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const { user } = useRequiredAuth();
  const {
    workspaceId,
    opportunities,
    assignments,
    quotations,
    acceptFixedOpportunity,
    submitQuotation,
    updateQuotationStatus,
    patchQuotation,
    saveOpportunity,
    developers,
    team,
    createThread,
  } = useWorkspaceStore();
  const opp = opportunities.find((o) => o.id === opportunityId);
  const profile = developers.find((d) => d.id === user.developerId);
  const myAssignment = assignments.find(
    (a) =>
      a.opportunityId === opportunityId && a.developerId === user.developerId
  );
  const myBid = useMemo(
    () =>
      quotations.find(
        (q) =>
          q.opportunityId === opportunityId &&
          q.developerId === user.developerId &&
          q.status !== "withdrawn"
      ),
    [quotations, opportunityId, user.developerId]
  );
  const pendingConfirmation = myAssignment?.status === "pending_confirmation";
  const workUnlocked =
    myAssignment != null && myAssignment.status !== "pending_confirmation";
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [step, setStep] = useState<BidStep>(1);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [cover, setCover] = useState("");
  const [understanding, setUnderstanding] = useState("");
  const [approach, setApproach] = useState("");
  const [experience, setExperience] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [question, setQuestion] = useState("");

  if (!opp) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
        <p className="font-semibold">Opportunity not found</p>
        <Button
          className="mt-4"
          render={<Link href="/developer/marketplace" />}
          nativeButton={false}
        >
          Back to marketplace
        </Button>
      </div>
    );
  }

  const verified = profile?.status === "verified";
  const deadlinePassed =
    !Number.isNaN(new Date(opp.deadline).getTime()) &&
    new Date(opp.deadline).getTime() < Date.now();
  const canApply =
    verified &&
    opp.status === "open" &&
    !myAssignment &&
    !myBid &&
    !deadlinePassed &&
    opp.pricing === "quotation";
  const canAcceptFixed =
    verified &&
    opp.status === "open" &&
    !myAssignment &&
    !deadlinePassed &&
    opp.pricing === "fixed";
  const canEditBid =
    myBid &&
    ["pending", "shortlisted"].includes(myBid.status) &&
    opp.status === "open";

  function openBidForm(existing?: typeof myBid) {
    setStep(1);
    setPrice(existing ? String(existing.price) : String(opp?.budgetMin ?? ""));
    setDays(
      existing ? String(existing.estimatedDays) : String(opp?.estimatedDays ?? "")
    );
    setCover(existing?.coverMessage ?? "");
    setUnderstanding(existing?.understanding ?? "");
    setApproach(existing?.approach ?? "");
    setExperience(existing?.relevantExperience ?? "");
    setPortfolio((existing?.portfolioLinks ?? []).join("\n"));
    setQuoteOpen(true);
  }

  function validateStep(current: BidStep) {
    if (current === 1) {
      if (!price || !days || !cover.trim()) {
        toast.error("Price, timeline, and cover letter are required");
        return false;
      }
      const p = Number(price);
      if (
        opp &&
        opp.pricing === "quotation" &&
        (p < opp.budgetMin || p > opp.budgetMax)
      ) {
        toast.error(
          `Proposed price must be between ${formatCurrency(opp.budgetMin)} and ${formatCurrency(opp.budgetMax)}`
        );
        return false;
      }
    }
    if (current === 2 && !understanding.trim()) {
      toast.error("Describe your understanding of the requirements");
      return false;
    }
    return true;
  }

  function submitBid() {
    if (!opp) return;
    if (!validateStep(1) || !validateStep(2)) return;
    const portfolioLinks = portfolio
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const commercial = {
      price: Number(price),
      estimatedDays: Number(days),
      coverMessage: cover.trim(),
      understanding: understanding.trim(),
      approach: approach.trim(),
      relevantExperience: experience.trim(),
      portfolioLinks,
    };
    if (myBid && canEditBid) {
      patchQuotation(myBid.id, commercial);
      toast.success("Bid updated");
    } else {
      submitQuotation({
        opportunityId: opp.id,
        developerId: user.developerId ?? "dev1",
        developerName: user.name,
        ...commercial,
      });
      toast.success("Bid submitted");
    }
    setQuoteOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {pendingConfirmation ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Waiting for admin confirmation</p>
          <p className="mt-1 text-amber-800">
            Your award is recorded. Work stays locked until an administrator
            confirms the assignment.
          </p>
        </div>
      ) : null}

      {workUnlocked && myAssignment ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <p className="font-medium">Assignment confirmed</p>
          <p className="mt-1 text-muted-foreground">
            You can start work from My Assignments.
          </p>
          <Button
            className="mt-2"
            size="sm"
            render={<Link href={`/developer/tasks/${myAssignment.id}`} />}
            nativeButton={false}
          >
            Open assignment
          </Button>
        </div>
      ) : null}

      {myBid ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">Your bid</p>
              <p className="mt-1 text-muted-foreground">
                {formatCurrency(myBid.price)} · {myBid.estimatedDays} days ·{" "}
                <span className="capitalize">{myBid.status}</span>
              </p>
              {myBid.rejectionReason ? (
                <p className="mt-1 text-destructive">
                  Feedback: {myBid.rejectionReason}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canEditBid ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openBidForm(myBid)}
                  >
                    Edit bid
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      updateQuotationStatus(myBid.id, "withdrawn");
                      toast.success("Bid withdrawn");
                    }}
                  >
                    Withdraw
                  </Button>
                </>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/developer/marketplace?tab=bids" />}
                nativeButton={false}
              >
                My Bids
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card px-5 py-5">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          render={<Link href="/developer/marketplace" />}
          nativeButton={false}
        >
          <ArrowLeft data-icon="inline-start" />
          Marketplace
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{opp.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {opp.projectName ?? "Independent task"} · Published by{" "}
          {opp.publishedBy}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opp.skills.map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {opp.pricing === "fixed" ? (
            <Button
              size="sm"
              disabled={!canAcceptFixed}
              onClick={() => setAcceptOpen(true)}
            >
              Accept fixed-price offer
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!canApply}
              onClick={() => openBidForm()}
            >
              Submit bid
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              saveOpportunity(opp.id, user.developerId ?? "dev1");
              toast.success("Saved");
            }}
          >
            Save
          </Button>
          {!verified ? (
            <p className="text-xs text-amber-700">
              Verification required before you can submit a bid.
            </p>
          ) : null}
          {deadlinePassed ? (
            <p className="text-xs text-amber-700">
              Bid submission deadline has passed.
            </p>
          ) : null}
          {opp.status !== "open" ? (
            <p className="text-xs text-muted-foreground capitalize">
              Opportunity is {opp.status}.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Description" className="xl:col-span-2">
          <p className="text-sm leading-6 text-muted-foreground">
            {opp.description}
          </p>
          <h3 className="mt-4 text-sm font-semibold">Scope</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {opp.scope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-sm font-semibold">Requirements</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {opp.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-sm font-semibold">Deliverables</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {opp.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title="Commercials">
            <Info
              label="Budget"
              value={`${formatCurrency(opp.budgetMin)} – ${formatCurrency(opp.budgetMax)}`}
            />
            <Info label="Pricing" value={opp.pricing} />
            <Info
              label="Estimated duration"
              value={`${opp.estimatedDays} days`}
            />
            <Info label="Bid deadline" value={formatDate(opp.deadline)} />
            <Info label="Experience" value={opp.experienceLevel} />
            <Info
              label="Eligibility"
              value={
                verified
                  ? "Verified — eligible to bid"
                  : "Verification required"
              }
            />
          </SectionCard>
          <SectionCard title="Ask a question">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Clarification for the publisher..."
            />
            <Button
              className="mt-2"
              size="sm"
              onClick={() => {
                void (async () => {
                  const body = question.trim();
                  if (!body) return;
                  try {
                    let recipientProfileId =
                      team.find(
                        (m) =>
                          m.permissionRole === "tenant_admin" ||
                          m.permissionRole === "project_manager"
                      )?.id ?? team[0]?.id;
                    if (isApiDataSource() && workspaceId) {
                      const recipients =
                        await listApiMessagingRecipients(workspaceId);
                      recipientProfileId =
                        recipients.find((r) => r.kind === "admin")?.id ??
                        recipientProfileId;
                    }
                    if (!recipientProfileId) {
                      toast.error("No admin recipient available");
                      return;
                    }
                    await createThread({
                      subject: `Question: ${opp.title}`,
                      projectId: opp.projectId,
                      visibility: "developer",
                      recipientProfileId,
                      body,
                    });
                    setQuestion("");
                    toast.success("Question sent to admin", {
                      description: (
                        <Link
                          href="/developer/messages"
                          className="underline underline-offset-2"
                        >
                          Open Messages
                        </Link>
                      ),
                    });
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Could not send question"
                    );
                  }
                })();
              }}
            >
              Send question
            </Button>
          </SectionCard>
        </div>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm fixed-price acceptance</DialogTitle>
            <DialogDescription>
              Confirm scope, price {formatCurrency(opp.budgetMax)} and deadline{" "}
              {formatDate(opp.deadline)}. Admin must confirm the assignment
              before work can begin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                acceptFixedOpportunity(
                  opp.id,
                  user.developerId ?? "dev1",
                  user.name
                );
                setAcceptOpen(false);
                toast.success("Acceptance recorded", {
                  description:
                    "Pending admin confirmation — work unlocks after approval.",
                });
              }}
            >
              Confirm acceptance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={quoteOpen}
        onOpenChange={(v) => {
          setQuoteOpen(v);
          if (!v) setStep(1);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {myBid && canEditBid ? "Edit bid" : "Submit bid"} · Step {step} of
              3
            </DialogTitle>
            <DialogDescription>
              Budget range {formatCurrency(opp.budgetMin)}–
              {formatCurrency(opp.budgetMax)} · Deadline{" "}
              {formatDate(opp.deadline)}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Opportunity: {opp.title} · {opp.experienceLevel} ·{" "}
                {opp.estimatedDays} days expected
              </div>
              <Input
                type="number"
                placeholder="Proposed price (USD)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Proposed delivery days"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
              <Textarea
                placeholder="Cover letter / proposal"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                rows={5}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3">
              <Textarea
                placeholder="Understanding of the project requirements"
                value={understanding}
                onChange={(e) => setUnderstanding(e.target.value)}
                rows={4}
              />
              <Textarea
                placeholder="Proposed approach"
                value={approach}
                onChange={(e) => setApproach(e.target.value)}
                rows={4}
              />
              <Textarea
                placeholder="Relevant experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={3}
              />
              <Textarea
                placeholder="Portfolio links (one per line)"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                rows={3}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">Review your bid</p>
              <p>
                Price: {formatCurrency(Number(price) || 0)} · Timeline: {days}{" "}
                days
              </p>
              <div>
                <p className="text-xs text-muted-foreground">Cover letter</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {cover}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Understanding</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {understanding}
                </p>
              </div>
              {approach ? (
                <div>
                  <p className="text-xs text-muted-foreground">Approach</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {approach}
                  </p>
                </div>
              ) : null}
              {experience ? (
                <div>
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {experience}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>
              Cancel
            </Button>
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as BidStep)}
              >
                Back
              </Button>
            ) : null}
            {step < 3 ? (
              <Button
                onClick={() => {
                  if (!validateStep(step)) return;
                  setStep((s) => (s + 1) as BidStep);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={submitBid}>
                {myBid && canEditBid ? "Update bid" : "Submit bid"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
