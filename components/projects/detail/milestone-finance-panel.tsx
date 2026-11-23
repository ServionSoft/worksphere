"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { fetchMilestoneProfitability } from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { formatCurrency } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function MilestoneFinancePanel({ projectId }: { projectId: string }) {
  const { workspace, milestones } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    totals: Record<string, number | null>;
    milestones: Array<Record<string, unknown>>;
    note: string;
  } | null>(null);

  useEffect(() => {
    if (!isApiDataSource() || !workspace?.id) return;
    let cancelled = false;
    setLoading(true);
    void fetchMilestoneProfitability(workspace.id, { projectId })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.id, projectId]);

  const local = milestones.filter((m) => m.projectId === projectId);
  const localClient = local.reduce((s, m) => s + (m.clientPrice ?? 0), 0);
  const localBudget = local.reduce((s, m) => s + (m.developerBudget ?? 0), 0);

  if (loading) {
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
        description="Contracted vs awarded vs paid. Approval alone is not received revenue."
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
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Milestone</th>
              <th className="px-4 py-2 font-medium">Client</th>
              <th className="px-4 py-2 font-medium">Budget</th>
              <th className="px-4 py-2 font-medium">Awarded</th>
              <th className="px-4 py-2 font-medium">Margin</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.milestones?.length
              ? data.milestones
              : local.map((m) => ({
                  milestoneTitle: m.title,
                  clientPrice: m.clientPrice ?? 0,
                  developerBudget: m.developerBudget ?? 0,
                  awardedDeveloperCost: m.awardedDeveloperCost,
                  contractedGrossMargin:
                    (m.clientPrice ?? 0) - (m.developerBudget ?? 0),
                  commercialStatus: m.commercialStatus,
                  productionStatus: m.status,
                }))
            ).map((row, i) => (
              <tr key={i} className="border-b border-border/70">
                <td className="px-4 py-2 font-medium">
                  {String(row.milestoneTitle)}
                </td>
                <td className="px-4 py-2">
                  {formatCurrency(Number(row.clientPrice) || 0)}
                </td>
                <td className="px-4 py-2">
                  {formatCurrency(Number(row.developerBudget) || 0)}
                </td>
                <td className="px-4 py-2">
                  {row.awardedDeveloperCost != null
                    ? formatCurrency(Number(row.awardedDeveloperCost))
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  {formatCurrency(Number(row.contractedGrossMargin) || 0)}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {String(row.commercialStatus ?? "")} /{" "}
                  {String(row.productionStatus ?? "")}
                </td>
              </tr>
            ))}
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
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
