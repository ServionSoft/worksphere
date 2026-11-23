"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessagingInbox } from "@/components/messaging/messaging-inbox";
import { NotificationCentre } from "@/components/notifications/notification-centre";
import { NotificationPreferencesPanel } from "@/components/notifications/notification-preferences-panel";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { demoId } from "@/lib/demo-clock";
import { clientDocuments, clientProjects } from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

export { ClientDocumentsPanel as ClientDocumentsPage } from "@/components/client/client-documents-panel";

export function ClientMessagesPage() {
  return <MessagingInbox portal="client" />;
}

export function ClientBillingPage() {
  const { user } = useRequiredAuth();
  const { invoices, updateInvoice } = useWorkspaceStore();
  const [filter, setFilter] = useState<"all" | "outstanding" | "paid">("all");
  const mine = invoices.filter((i) => i.clientId === user.clientId);
  const outstandingInvoices = mine.filter(
    (i) => i.status === "sent" || i.status === "overdue" || i.status === "partial"
  );
  const outstanding = outstandingInvoices.reduce((sum, i) => sum + i.amount, 0);
  const paidInvoices = mine.filter((i) => i.status === "paid");
  const visible =
    filter === "outstanding"
      ? outstandingInvoices
      : filter === "paid"
        ? paidInvoices
        : mine;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Billing"
        description="Quotations, invoices and payment status. No live payment gateway in demo."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Outstanding"
          value={formatCurrency(outstanding)}
        />
        <Stat
          label="Paid invoices"
          value={String(paidInvoices.length)}
        />
        <Stat label="Total invoices" value={String(mine.length)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["outstanding", "Outstanding"],
            ["paid", "Paid"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "secondary" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <SectionCard title="Invoices" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {visible.map((inv) => {
            const canPay =
              inv.status === "sent" ||
              inv.status === "overdue" ||
              inv.status === "partial";
            return (
              <li
                key={inv.id}
                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {inv.number} · {inv.projectName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.milestoneTitle} · Issued {formatDate(inv.issuedAt)} · Due{" "}
                    {formatDate(inv.dueAt)} · {inv.status}
                    {inv.paidAt ? ` · paid ${formatDate(inv.paidAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(inv.amount, inv.currency)}
                  </p>
                  {canPay ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateInvoice(inv.id, { status: "paid" });
                        toast.success("Payment recorded", {
                          description: `${inv.number} marked paid (demo).`,
                        });
                      }}
                    >
                      Pay
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
          {visible.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No invoices in this filter.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}

export function ClientNotificationsPage() {
  return (
    <NotificationCentre portal="client" settingsHref="/client/settings" />
  );
}

export function ClientSettingsPage() {
  const { user } = useRequiredAuth();
  const [displayName, setDisplayName] = useLocalStorage(
    "worksphere.client.displayName",
    user.name
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Profile and notification delivery preferences."
      />
      <SectionCard title="Profile">
        <div className="flex max-w-md flex-col gap-3">
          <label className="text-xs font-medium">Display name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <label className="text-xs font-medium">Email</label>
          <Input value={user.email} disabled />
          <Button
            className="w-fit"
            onClick={() => {
              setDisplayName(displayName.trim() || user.name);
              toast.success("Display name saved for this browser");
            }}
          >
            Save display name
          </Button>
        </div>
      </SectionCard>
      <NotificationPreferencesPanel />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
