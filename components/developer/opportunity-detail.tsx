"use client";

import { useState } from "react";
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

export function OpportunityDetailPage({ opportunityId }: { opportunityId: string }) {
  const { user } = useRequiredAuth();
  const {
    workspaceId,
    opportunities,
    assignments,
    acceptFixedOpportunity,
    submitQuotation,
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
  const pendingConfirmation = myAssignment?.status === "pending_confirmation";
  const workUnlocked =
    myAssignment != null &&
    myAssignment.status !== "pending_confirmation";
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [cover, setCover] = useState("");
  const [question, setQuestion] = useState("");

  if (!opp) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
        <p className="font-semibold">Opportunity not found</p>
        <Button className="mt-4" render={<Link href="/developer/marketplace" />} nativeButton={false}>
          Back to marketplace
        </Button>
      </div>
    );
  }

  const verified = profile?.status === "verified";
  const canApply = verified && opp.status === "open" && !myAssignment;

  return (
    <div className="flex flex-col gap-5">
      {pendingConfirmation ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Waiting for admin confirmation</p>
          <p className="mt-1 text-amber-800">
            Your acceptance is recorded. Work stays locked until an administrator
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
          {opp.projectName ?? "Independent task"} · Published by {opp.publishedBy}
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
              disabled={!canApply}
              onClick={() => setAcceptOpen(true)}
            >
              Accept fixed-price offer
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!canApply}
              onClick={() => setQuoteOpen(true)}
            >
              Submit quotation
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
              Verification required for restricted assignments.
            </p>
          ) : null}
          {pendingConfirmation ? (
            <p className="w-full text-xs text-amber-700">
              Work submission unlocks after admin confirmation (not_started+).
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Description" className="xl:col-span-2">
          <p className="text-sm leading-6 text-muted-foreground">{opp.description}</p>
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
            <Info label="Estimated duration" value={`${opp.estimatedDays} days`} />
            <Info label="Deadline" value={formatDate(opp.deadline)} />
            <Info label="Experience" value={opp.experienceLevel} />
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
          </SectionCard>        </div>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm fixed-price acceptance</DialogTitle>
            <DialogDescription>
              Confirm scope, price {formatCurrency(opp.budgetMax)} and deadline{" "}
              {formatDate(opp.deadline)}. Admin must confirm the assignment before
              work can begin.
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

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit quotation</DialogTitle>
            <DialogDescription>
              Propose price, timeline and a short cover message.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              type="number"
              placeholder="Proposed price (USD)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Estimated days"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
            <Textarea
              placeholder="Cover message / relevant experience"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!price || !days || !cover.trim()) {
                  toast.error("Complete all quotation fields");
                  return;
                }
                submitQuotation({
                  opportunityId: opp.id,
                  developerId: user.developerId ?? "dev1",
                  developerName: user.name,
                  price: Number(price),
                  estimatedDays: Number(days),
                  coverMessage: cover.trim(),
                });
                setQuoteOpen(false);
                toast.success("Quotation submitted");
              }}
            >
              Submit quotation
            </Button>
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
