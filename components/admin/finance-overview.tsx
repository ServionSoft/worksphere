"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";

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
    updateInvoice,
    markEarningPaid,
  } = useWorkspaceStore();

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
    () => unpaidEarnings.reduce((sum, e) => sum + e.amount, 0),
    [unpaidEarnings]
  );

  const developerName = (id: string) =>
    developers.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Finance"
        description="Budgets, client invoices, developer earnings and outstanding balances (demo)."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Project budgets" value={formatCurrency(budgetTotals.budget)} />
        <Stat label="Spent" value={formatCurrency(budgetTotals.spent)} />
        <Stat
          label="Outstanding invoices"
          value={formatCurrency(outstandingInvoiceTotal)}
        />
        <Stat
          label="Unpaid earnings"
          value={formatCurrency(unpaidEarningsTotal)}
        />
      </div>

      <Tabs defaultValue="budgets">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="earnings">
            Earnings ({earnings.length})
          </TabsTrigger>
        </TabsList>

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
            description="Approve payouts with markEarningPaid (demo dates)."
            bodyClassName="p-0"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => {
                  const unpaid = earning.status !== "paid";
                  return (
                    <TableRow key={earning.id}>
                      <TableCell className="font-medium">
                        {earning.assignmentTitle}
                      </TableCell>
                      <TableCell>
                        {developerName(earning.developerId)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDate(earning.earnedAt)}
                        {earning.paidAt
                          ? ` · paid ${formatDate(earning.paidAt)}`
                          : ""}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatCurrency(earning.amount, earning.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {earning.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {unpaid ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              markEarningPaid(earning.id);
                              toast.success("Earning paid", {
                                description: `${earning.assignmentTitle} marked paid (demo).`,
                              });
                            }}
                          >
                            Mark paid
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Paid
                          </span>
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
      </Tabs>
    </div>
  );
}
