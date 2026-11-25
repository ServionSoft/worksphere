"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import {
  approveApiMilestoneDelivery,
  fetchMilestoneProfitability,
  fundApiMilestone,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { formatCurrency, formatDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function MilestoneFinancePanel({ projectId }: { projectId: string }) {
  const { workspace, milestones, setWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [data, setData] = useState<{
    totals: Record<string, number | null>;
    milestones: Array<Record<string, unknown>>;
    note: string;
  } | null>(null);

  const reload = useCallback(() => {
    if (!isApiDataSource() || !workspace?.id) return;
    setLoading(true);
    void fetchMilestoneProfitability(workspace.id, { projectId })
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [workspace?.id, projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const local = milestones.filter((m) => m.projectId === projectId);
  const localClient = local.reduce((s, m) => s + (m.clientPrice ?? 0), 0);
  const localBudget = local.reduce((s, m) => s + (m.developerBudget ?? 0), 0);

  async function onFund(milestoneId: string) {
    if (!workspace?.id) return;
    const reference = window.prompt(
      "Funding reference (invoice / bank / transfer id)",
      `manual-fund-${milestoneId.slice(0, 8)}`
    );
    if (reference == null) return;
    setBusyId(milestoneId);
    try {
      await fundApiMilestone(workspace.id, milestoneId, {
        status: "funded",
        reference: reference.trim() || undefined,
        note: "Manual funding recorded — no payment provider configured",
      });
      toast.success("Milestone marked funded (manual ledger)");
      setWorkspaceId(workspace.id);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Funding failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onApproveDelivery(milestoneId: string) {
    if (!workspace?.id) return;
    setBusyId(milestoneId);
    try {
      const result = await approveApiMilestoneDelivery(workspace.id, milestoneId);
      toast.success("Delivery approved — payout clearance started", {
        description: `Available after ${result.clearanceDays} calendar day(s)`,
      });
      setWorkspaceId(workspace.id);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve delivery failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading profitability…
      </div>
    );
  }

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Milestone profitability"
        description="Contracted vs awarded vs funded vs clearance vs paid. No payment provider is configured — funding and payouts are ledger/manual."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Contracted client revenue"
            value={formatCurrency(
              Number(totals?.contractedClientRevenue ?? localClient)
            )}
          />
          <Stat
            label="Original developer budget"
            value={formatCurrency(
              Number(totals?.originalDeveloperBudget ?? localBudget)
            )}
          />
          <Stat
            label="Awarded developer cost"
            value={formatCurrency(Number(totals?.awardedDeveloperCost ?? 0))}
          />
          <Stat
            label="Paid to developers"
            value={formatCurrency(Number(totals?.paidDeveloperCost ?? 0))}
          />
          <Stat
            label="Contracted margin"
            value={formatCurrency(
              Number(
                totals?.contractedGrossMargin ?? localClient - localBudget
              )
            )}
          />
          <Stat
            label="Invoiced revenue"
            value={formatCurrency(Number(totals?.invoicedRevenue ?? 0))}
          />
          <Stat
            label="Received revenue"
            value={formatCurrency(Number(totals?.receivedRevenue ?? 0))}
          />
          <Stat
            label="Outstanding developer pay"
            value={formatCurrency(
              Number(totals?.outstandingDeveloperPayments ?? 0)
            )}
          />
        </div>
        {data?.note ? (
          <p className="mt-4 text-xs text-muted-foreground">{data.note}</p>
        ) : null}
      </SectionCard>

      <SectionCard title="By milestone" bodyClassName="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Milestone</th>
              <th className="px-4 py-2 font-medium">Client</th>
              <th className="px-4 py-2 font-medium">Budget</th>
              <th className="px-4 py-2 font-medium">Awarded</th>
              <th className="px-4 py-2 font-medium">Funding</th>
              <th className="px-4 py-2 font-medium">Payout</th>
              <th className="px-4 py-2 font-medium">Available</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.milestones?.length
              ? data.milestones
              : local.map((m) => ({
                  milestoneId: m.id,
                  milestoneTitle: m.title,
                  clientPrice: m.clientPrice ?? 0,
                  developerBudget: m.developerBudget ?? 0,
                  awardedDeveloperCost: m.awardedDeveloperCost,
                  awardedGrossMargin: null,
                  fundingStatus: m.fundingStatus ?? "not_funded",
                  payoutStatus: null,
                  availableAt: null,
                  deliveryApprovedAt: m.deliveryApprovedAt,
                }))
            ).map((row) => {
              const id = String(row.milestoneId);
              const funding = String(row.fundingStatus ?? "not_funded");
              const payout = row.payoutStatus
                ? String(row.payoutStatus)
                : "—";
              const busy = busyId === id;
              return (
                <tr key={id} className="border-b border-border/70">
                  <td className="px-4 py-2.5 font-medium">
                    {String(row.milestoneTitle)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatCurrency(Number(row.clientPrice ?? 0))}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatCurrency(Number(row.developerBudget ?? 0))}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {row.awardedDeveloperCost != null
                      ? formatCurrency(Number(row.awardedDeveloperCost))
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">
                    {funding.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">
                    {payout.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {row.availableAt
                      ? formatDate(String(row.availableAt))
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {funding !== "funded" ? (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void onFund(id)}
                        >
                          {busy ? (
                            <Loader2
                              className="animate-spin"
                              data-icon="inline-start"
                            />
                          ) : null}
                          Mark funded
                        </Button>
                      ) : null}
                      {!row.deliveryApprovedAt &&
                      row.awardedDeveloperCost != null ? (
                        <Button
                          size="xs"
                          disabled={busy}
                          onClick={() => void onApproveDelivery(id)}
                        >
                          Approve delivery
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
