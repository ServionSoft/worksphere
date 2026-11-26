"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchApiFeeSettings,
  placeApiPayoutHold,
  putApiFeeSettings,
  refreshApiPayoutEligibility,
  resolveApiPayoutHold,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { formatCurrency, formatDate } from "@/lib/format";
import { ChangeOrdersPanel } from "@/components/admin/change-orders-panel";
import { MarkPaidDialog } from "@/components/admin/mark-paid-dialog";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { MilestoneFinancePanel } from "@/components/projects/detail/milestone-finance-panel";
import type { EarningRecord } from "@/lib/portal-types";
import {
  fetchApiPaymentProofDownloadUrl,
} from "@/lib/api/workspace-api";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export function FinanceOverview() {
  const {
    projects,
    invoices,
    earnings,
    developers,
    workspace,
    setWorkspaceId,
    updateInvoice,
  } = useWorkspaceStore();

  const [feePercent, setFeePercent] = useState("0");
  const [fixedFee, setFixedFee] = useState("0");
  const [feeNotes, setFeeNotes] = useState("");
  const [feeBusy, setFeeBusy] = useState(false);
  const [holdIds, setHoldIds] = useState<Record<string, string>>({});
  const [payTarget, setPayTarget] = useState<EarningRecord | null>(null);

  useEffect(() => {
    if (!workspace?.id || !isApiDataSource()) return;
    let cancelled = false;
    void fetchApiFeeSettings(workspace.id)
      .then((s) => {
        if (cancelled) return;
        setFeePercent(String(s.platformFeePercent ?? 0));
        setFixedFee(String(s.fixedFee ?? 0));
        setFeeNotes(s.notes ?? "");
      })
      .catch(() => {
        /* fee settings optional until migration */
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.id]);

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.archived),
    [projects]
  );

  const budgetTotals = useMemo(() => {
    const budget = activeProjects.reduce((sum, p) => sum + p.budget, 0);
    const spent = activeProjects.reduce((sum, p) => sum + p.spent, 0);
    return { budget, spent, remaining: budget - spent };
  }, [activeProjects]);

  const outstandingInvoices = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.status === "sent" ||
          i.status === "overdue" ||
          i.status === "partial" ||
          i.status === "draft"
      ),
    [invoices]
  );

  const outstandingInvoiceTotal = useMemo(
    () =>
      outstandingInvoices
        .filter((i) => i.status !== "draft")
        .reduce((sum, i) => sum + i.amount, 0),
    [outstandingInvoices]
  );

  const unpaidEarnings = useMemo(
    () => earnings.filter((e) => e.status !== "paid"),
    [earnings]
  );

  const unpaidEarningsTotal = useMemo(
    () => unpaidEarnings.reduce((sum, e) => sum + (e.netAmount ?? e.amount), 0),
    [unpaidEarnings]
  );

  const developerName = (id: string) =>
    developers.find((d) => d.id === id)?.name ?? id;

  async function saveFeeSettings() {
    if (!workspace?.id || !isApiDataSource()) {
      toast.error("Fee settings require API mode");
      return;
    }
    setFeeBusy(true);
    try {
      const result = await putApiFeeSettings(workspace.id, {
        platformFeePercent: Number(feePercent) || 0,
        fixedFee: Number(fixedFee) || 0,
        notes: feeNotes || undefined,
      });
      toast.success("Fee settings saved", {
        description: `Preview net on $1000: ${formatCurrency(result.preview.netAmount)}`,
      });
      setWorkspaceId(workspace.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save fee settings failed");
    } finally {
      setFeeBusy(false);
    }
  }

  async function viewProof(earningId: string) {
    if (!workspace?.id) return;
    try {
      const result = await fetchApiPaymentProofDownloadUrl(
        workspace.id,
        earningId
      );
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open proof");
    }
  }

  async function holdEarning(earningId: string) {
    if (!workspace?.id || !isApiDataSource()) {
      toast.error("Holds require API mode");
      return;
    }
    const reason = window.prompt("Hold reason (required)")?.trim() ?? "";
    if (!reason) {
      toast.error("Hold reason is required");
      return;
    }
    try {
      const result = await placeApiPayoutHold(workspace.id, earningId, {
        reason,
      });
      setHoldIds((prev) => ({ ...prev, [earningId]: result.holdId }));
      toast.success("Payout hold placed", {
        description: `Hold ${result.holdId.slice(0, 8)}…`,
      });
      setWorkspaceId(workspace.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Place hold failed");
    }
  }

  async function resolveHold(earningId: string) {
    if (!workspace?.id || !isApiDataSource()) return;
    const known = holdIds[earningId];
    const holdId =
      known ||
      window.prompt("Hold ID to resolve")?.trim() ||
      "";
    if (!holdId) {
      toast.error("Hold ID required");
      return;
    }
    try {
      await resolveApiPayoutHold(workspace.id, holdId);
      setHoldIds((prev) => {
        const next = { ...prev };
        delete next[earningId];
        return next;
      });
      toast.success("Hold resolved");
      setWorkspaceId(workspace.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resolve hold failed");
    }
  }

  async function refreshEligibility() {
    if (!workspace?.id || !isApiDataSource()) return;
    try {
      const result = await refreshApiPayoutEligibility(workspace.id);
      toast.success("Eligibility refreshed", {
        description: `${result.updatedCount} earning(s) updated`,
      });
      setWorkspaceId(workspace.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Finance"
        description="Budgets, invoices, earnings, fees, and commercial change orders."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Project budgets" value={formatCurrency(budgetTotals.budget)} />
        <Stat label="Spent" value={formatCurrency(budgetTotals.spent)} />
        <Stat
          label="Outstanding invoices"
          value={formatCurrency(outstandingInvoiceTotal)}
        />
        <Stat
          label="Unpaid earnings (net)"
          value={formatCurrency(unpaidEarningsTotal)}
        />
      </div>

      <Tabs defaultValue="budgets">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="profitability">Milestone profitability</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="earnings">
            Earnings ({earnings.length})
          </TabsTrigger>
          <TabsTrigger value="fees">Platform fees</TabsTrigger>
          <TabsTrigger value="change-orders">Change orders</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="mt-4">
          {activeProjects[0]?.id ? (
            <>
              <MilestoneFinancePanel projectId={activeProjects[0].id} />
              <p className="mt-2 text-xs text-muted-foreground">
                Showing {activeProjects[0].name}. Open Project → Finance for
                other projects.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active projects.</p>
          )}
        </TabsContent>

        <TabsContent value="budgets" className="mt-4">
          <SectionCard
            title="Project budgets vs spent"
            description={`${activeProjects.length} active projects · ${formatCurrency(budgetTotals.remaining)} remaining`}
            bodyClassName="p-0"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead className="min-w-36">Utilization</TableHead>
                  <TableHead>Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProjects.map((project) => {
                  const pct =
                    project.budget > 0
                      ? Math.min(
                          100,
                          Math.round((project.spent / project.budget) * 100)
                        )
                      : 0;
                  const remaining = project.budget - project.spent;
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.clientName}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(project.budget, project.currency)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(project.spent, project.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="min-w-20 flex-1" />
                          <span className="w-8 text-right text-xs tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`tabular-nums ${
                          remaining < 0
                            ? "text-amber-700"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(remaining, project.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {activeProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No active projects.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <SectionCard
            title="Client invoices"
            description="Mark draft invoices as sent, or mark outstanding invoices paid."
            bodyClassName="p-0"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const canSend = inv.status === "draft";
                  const canPay =
                    inv.status === "sent" ||
                    inv.status === "overdue" ||
                    inv.status === "partial";
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inv.number}</p>
                          {inv.milestoneTitle ? (
                            <p className="text-xs text-muted-foreground">
                              {inv.milestoneTitle}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{inv.projectName}</TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDate(inv.issuedAt)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDate(inv.dueAt)}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatCurrency(inv.amount, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canSend ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateInvoice(inv.id, { status: "sent" });
                                toast.success("Invoice sent", {
                                  description: `${inv.number} marked sent (demo).`,
                                });
                              }}
                            >
                              Mark sent
                            </Button>
                          ) : null}
                          {canPay ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                updateInvoice(inv.id, { status: "paid" });
                                toast.success("Invoice paid", {
                                  description: `${inv.number} marked paid (demo).`,
                                });
                              }}
                            >
                              Mark paid
                            </Button>
                          ) : null}
                          {!canSend && !canPay ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="earnings" className="mt-4">
          <SectionCard
            title="Developer earnings"
            description="Mark paid requires developer payout account, amount, date, txn reference, and screenshot/PDF proof. Holds pause eligibility until resolved."
            action={
              isApiDataSource() ? (
                <Button size="sm" variant="outline" onClick={() => void refreshEligibility()}>
                  Refresh eligibility
                </Button>
              ) : null
            }
            bodyClassName="p-0"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead>Gross / fee / net</TableHead>
                  <TableHead>Clearance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => {
                  const unpaid = earning.status !== "paid";
                  const payout = String(earning.payoutStatus ?? earning.status);
                  const onHold = payout === "on_hold";
                  const canPay =
                    unpaid && (payout === "eligible" || payout === "pending" || !earning.payoutStatus);
                  return (
                    <TableRow key={earning.id}>
                      <TableCell className="font-medium">
                        {earning.assignmentTitle}
                      </TableCell>
                      <TableCell>
                        {developerName(earning.developerId)}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        <div>
                          {formatCurrency(
                            earning.grossAmount ?? earning.amount,
                            earning.currency
                          )}
                        </div>
                        {(earning.platformFee ?? 0) > 0 ? (
                          <div className="text-xs text-muted-foreground">
                            fee {formatCurrency(earning.platformFee!, earning.currency)}
                            {earning.feePercentSnapshot != null
                              ? ` (${earning.feePercentSnapshot}%)`
                              : ""}
                          </div>
                        ) : null}
                        <div className="font-medium">
                          net{" "}
                          {formatCurrency(
                            earning.netAmount ?? earning.amount,
                            earning.currency
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {earning.availableAt
                          ? `Avail ${formatDate(earning.availableAt)}`
                          : earning.clearanceDays != null
                            ? `${earning.clearanceDays}d`
                            : "—"}
                        {earning.earnedAt
                          ? ` · earned ${formatDate(earning.earnedAt)}`
                          : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payout}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {unpaid ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            {canPay ? (
                              <Button
                                size="sm"
                                onClick={() => setPayTarget(earning)}
                              >
                                Mark paid
                              </Button>
                            ) : null}
                            {isApiDataSource() && !onHold ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void holdEarning(earning.id)}
                              >
                                Hold
                              </Button>
                            ) : null}
                            {isApiDataSource() && onHold ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void resolveHold(earning.id)}
                              >
                                Resolve hold
                              </Button>
                            ) : null}
                            {!canPay && !onHold ? (
                              <span className="text-xs text-muted-foreground">
                                Awaiting clearance
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground">
                              Paid
                              {earning.providerReference
                                ? ` · ${earning.providerReference}`
                                : ""}
                            </span>
                            {earning.hasPaymentProof && workspace?.id ? (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => void viewProof(earning.id)}
                              >
                                View proof
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {earnings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No earnings records.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <SectionCard
            title="Platform fee settings"
            description="Percent and fixed fee snapshot onto earnings when delivery is approved. Defaults remain 0 until you set them."
          >
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Platform fee %</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Fixed fee</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={fixedFee}
                  onChange={(e) => setFixedFee(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Notes</span>
                <Input
                  value={feeNotes}
                  onChange={(e) => setFeeNotes(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="mt-4">
              <Button disabled={feeBusy} onClick={() => void saveFeeSettings()}>
                {feeBusy ? "Saving…" : "Save fee settings"}
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="change-orders" className="mt-4">
          <ChangeOrdersPanel />
        </TabsContent>
      </Tabs>

      {workspace?.id ? (
        <MarkPaidDialog
          open={Boolean(payTarget)}
          onOpenChange={(v) => !v && setPayTarget(null)}
          workspaceId={workspace.id}
          earning={payTarget}
          developerName={
            payTarget ? developerName(payTarget.developerId) : ""
          }
          onPaid={() => {
            if (workspace.id) setWorkspaceId(workspace.id);
          }}
        />
      ) : null}
    </div>
  );
}
