"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { demoId } from "@/lib/demo-clock";
import { clientDocuments, clientProjects } from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

export function ClientDocumentsPage() {
  const { user } = useRequiredAuth();
  const { projects, documents, addDocument } = useWorkspaceStore();
  const ids = clientProjects(projects, user).map((p) => p.id);
  const docs = clientDocuments(documents, ids);
  const [query, setQuery] = useState("");

  const filtered = docs.filter((d) =>
    d.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Documents"
        description="Contracts, specs, deliverables and reports for your projects."
        actions={
          <Button
            size="sm"
            onClick={() => {
              if (!ids[0]) return;
              addDocument({
                projectId: ids[0],
                name: `Client-upload-${demoId("f")}.pdf`,
                type: "file",
                sizeLabel: "860 KB",
                uploadedBy: user.name,
                version: "v1.0",
              });
              toast.success("Upload simulated", {
                description: "File metadata stored locally — not cloud storage.",
              });
            }}
          >
            Upload
          </Button>
        }
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents..."
        className="max-w-sm"
      />
      <SectionCard title="Library" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {filtered.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.type} · {doc.version} · {doc.uploadedBy} ·{" "}
                  {formatShortDate(doc.uploadedAt)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast.message("Download simulated", { description: doc.name })
                }
              >
                Download
              </Button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

export function ClientMessagesPage() {
  const { user } = useRequiredAuth();
  const { threads, messages, sendMessage, projects } = useWorkspaceStore();
  const ids = clientProjects(projects, user).map((p) => p.id);
  const clientThreads = threads.filter(
    (t) => t.visibility === "client" && (!t.projectId || ids.includes(t.projectId))
  );
  const [activeId, setActiveId] = useState(clientThreads[0]?.id ?? "");
  const [body, setBody] = useState("");
  const active = clientThreads.find((t) => t.id === activeId);
  const threadMessages = messages
    .filter((m) => m.threadId === activeId && m.visibility === "client")
    .slice()
    .reverse();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Messages"
        description="Client-visible project conversations. Internal admin chats stay private."
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <SectionCard title="Conversations" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {clientThreads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 ${
                    activeId === thread.id ? "bg-muted/60" : ""
                  }`}
                  onClick={() => setActiveId(thread.id)}
                >
                  <p className="text-sm font-medium">{thread.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {thread.projectName}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title={active?.subject ?? "Select a conversation"}>
          <div className="flex min-h-72 flex-col gap-3">
            {threadMessages.map((m) => (
              <div key={m.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs font-medium">
                  {m.authorName}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {formatShortDate(m.createdAt)}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
              </div>
            ))}
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a message..."
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!active || !body.trim()}
                onClick={() => {
                  if (!active) return;
                  sendMessage({
                    threadId: active.id,
                    projectId: active.projectId,
                    authorId: user.id,
                    authorName: user.name,
                    body: body.trim(),
                    visibility: "client",
                  });
                  setBody("");
                  toast.success("Message sent");
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
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
  const { user } = useRequiredAuth();
  const { portalNotifications, markNotificationRead } = useWorkspaceStore();
  const notes = portalNotifications.filter(
    (n) => n.portal === "client" && n.userId === user.id
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Notifications" description="Client portal alerts." />
      <SectionCard title="Inbox" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
              {!n.read ? (
                <Button size="sm" variant="outline" onClick={() => markNotificationRead(n.id)}>
                  Mark read
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground">Read</span>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
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
        description="Client account preferences (demo)."
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
              toast.success("Preferences saved locally", {
                description: "Display name preference stored in this browser.",
              });
            }}
          >
            Save changes
          </Button>
        </div>
      </SectionCard>
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
