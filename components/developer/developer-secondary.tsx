"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { DeveloperProfile } from "@/lib/portal-types";
import { toast } from "sonner";

export function DeveloperSubmissionsPage() {
  const { user } = useRequiredAuth();
  const { assignments, workSubmissions } = useWorkspaceStore();
  const mine = assignments.filter((a) => a.developerId === user.developerId);
  const ids = new Set(mine.map((a) => a.id));
  const items = workSubmissions.filter((w) => ids.has(w.assignmentId));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Submissions"
        description="Immutable submission versions for your assignments."
      />
      <SectionCard title="History" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    v{item.version} · {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.status}
                    {item.clientApprovalStatus !== "not_required"
                      ? ` · client: ${item.clientApprovalStatus}`
                      : ""}
                    {item.revisionNotes ? ` · ${item.revisionNotes}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={`/developer/tasks/${item.assignmentId}`} />
                  }
                  nativeButton={false}
                >
                  Open assignment
                </Button>
              </div>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No submissions yet.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}

export function DeveloperEarningsPage() {
  const { user } = useRequiredAuth();
  const { earnings } = useWorkspaceStore();
  const mine = earnings.filter((e) => e.developerId === user.developerId);
  const paid = mine.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const pending = mine
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + e.amount, 0);
  const approved = mine
    .filter((e) => e.status === "approved")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Earnings"
        description="Mock financial dashboard. No real payment processing."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Paid" value={formatCurrency(paid)} />
        <Stat label="Approved" value={formatCurrency(approved)} />
        <Stat label="Pending" value={formatCurrency(pending)} />
      </div>
      <SectionCard title="Payment history" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {mine.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{e.assignmentTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {e.status} · {formatDate(e.earnedAt)}
                  {e.paidAt ? ` · paid ${formatDate(e.paidAt)}` : ""}
                </p>
              </div>
              <p className="font-semibold tabular-nums">
                {formatCurrency(e.amount, e.currency)}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

export function DeveloperProfilePage() {
  const { user } = useRequiredAuth();
  const { developers, updateDeveloperProfile } = useWorkspaceStore();
  const profile = developers.find((d) => d.id === user.developerId);
  const [form, setForm] = useState<Partial<DeveloperProfile>>(profile ?? {});

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-semibold">No developer profile</p>
        <Button className="mt-4" render={<Link href="/developer/register" />} nativeButton={false}>
          Start registration
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Profile"
        description={`Status: ${profile.status.replace("_", " ")}`}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Performance" className="xl:col-span-1">
          <p className="text-sm">Rating: <strong>{profile.rating}</strong></p>
          <p className="mt-2 text-sm">
            On-time: <strong>{profile.onTimePercent}%</strong>
          </p>
          <p className="mt-2 text-sm">
            Completed: <strong>{profile.completedAssignments}</strong>
          </p>
          <p className="mt-2 text-sm">
            Earnings: <strong>{formatCurrency(profile.totalEarnings)}</strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Edit profile" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Title"
              value={form.title ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, title: v }))}
            />
            <Field
              label="Hourly rate"
              value={String(form.hourlyRate ?? "")}
              onChange={(v) => setForm((p) => ({ ...p, hourlyRate: Number(v) || 0 }))}
            />
            <Field
              label="Country"
              value={form.country ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, country: v }))}
            />
            <Field
              label="Portfolio URL"
              value={form.portfolioUrl ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, portfolioUrl: v }))}
            />
          </div>
          <label className="mt-3 block text-xs font-medium">Bio</label>
          <Textarea
            className="mt-1"
            value={form.bio ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          />
          <Button
            className="mt-3"
            onClick={() => {
              updateDeveloperProfile(profile.id, form);
              toast.success("Profile updated locally");
            }}
          >
            Save profile
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}

export function DeveloperRegisterPage() {
  const { registerDeveloper } = useWorkspaceStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("React, TypeScript");
  const [bio, setBio] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Developer registration"
        description={`Step ${step} of 6 — demo onboarding flow.`}
      />
      <SectionCard title="Onboarding">
        {step === 1 ? (
          <div className="grid max-w-lg gap-3">
            <Field label="Full name" value={name} onChange={setName} />
            <Field label="Email" value={email} onChange={setEmail} />
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid max-w-lg gap-3">
            <Field label="Professional title" value={title} onChange={setTitle} />
            <Field label="Phone" value="+1 555 0100" onChange={() => undefined} />
            <Field label="Country" value="United States" onChange={() => undefined} />
          </div>
        ) : null}
        {step === 3 ? (
          <Field label="Skills (comma separated)" value={skills} onChange={setSkills} />
        ) : null}
        {step === 4 ? (
          <div className="grid max-w-lg gap-3">
            <Field label="Portfolio URL" value="https://" onChange={() => undefined} />
            <Field label="GitHub URL" value="https://github.com/" onChange={() => undefined} />
            <Button
              variant="outline"
              onClick={() =>
                toast.message("CV upload simulated", {
                  description: "Metadata only — not stored in cloud.",
                })
              }
            >
              Upload CV
            </Button>
          </div>
        ) : null}
        {step === 5 ? (
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short professional introduction"
          />
        ) : null}
        {step === 6 ? (
          <p className="text-sm text-muted-foreground">
            Submit verification request. An administrator must approve before restricted
            marketplace access is granted.
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Back
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button
              onClick={() => {
                registerDeveloper({
                  id: `dev${Date.now()}`,
                  userId: `du${Date.now()}`,
                  name: name || "New Developer",
                  email: email || "dev@example.com",
                  phone: "",
                  country: "Unknown",
                  title: title || "Developer",
                  skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
                  experienceYears: 1,
                  hourlyRate: 50,
                  availability: "available",
                  bio: bio || "New developer profile",
                  status: "pending_verification",
                  rating: 0,
                  completedAssignments: 0,
                  onTimePercent: 0,
                  totalEarnings: 0,
                });
                toast.success("Verification request submitted");
              }}
            >
              Submit for verification
            </Button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

export function DeveloperMessagesPage() {
  const { user } = useRequiredAuth();
  const { threads, messages, sendMessage } = useWorkspaceStore();
  const mine = threads.filter((t) => t.visibility === "developer");
  const [activeId, setActiveId] = useState(mine[0]?.id ?? "");
  const [body, setBody] = useState("");
  const threadMessages = messages
    .filter((m) => m.threadId === activeId)
    .slice()
    .reverse();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Messages" description="Assignment and PM conversations." />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <SectionCard title="Threads" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {mine.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 ${
                    activeId === t.id ? "bg-muted/60" : ""
                  }`}
                  onClick={() => setActiveId(t.id)}
                >
                  <p className="text-sm font-medium">{t.subject}</p>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Conversation">
          <div className="flex min-h-72 flex-col gap-3">
            {threadMessages.map((m) => (
              <div key={m.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs font-medium">
                  {m.authorName} · {formatShortDate(m.createdAt)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
              </div>
            ))}
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
            <Button
              size="sm"
              className="w-fit"
              onClick={() => {
                if (!activeId || !body.trim()) return;
                sendMessage({
                  threadId: activeId,
                  authorId: user.id,
                  authorName: user.name,
                  body: body.trim(),
                  visibility: "developer",
                });
                setBody("");
              }}
            >
              Send
            </Button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export function DeveloperNotificationsPage() {
  const { user } = useRequiredAuth();
  const { portalNotifications, markNotificationRead } = useWorkspaceStore();
  const notes = portalNotifications.filter(
    (n) => n.portal === "developer" && n.userId === user.id
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Notifications" />
      <SectionCard title="Inbox" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {notes.map((n) => (
            <li key={n.id} className="flex justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
              {!n.read ? (
                <Button size="sm" variant="outline" onClick={() => markNotificationRead(n.id)}>
                  Mark read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

export function DeveloperSettingsPage() {
  const { user } = useRequiredAuth();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Developer account preferences (demo)." />
      <SectionCard title="Account">
        <p className="text-sm">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <Button
          className="mt-3"
          onClick={() =>
            toast.success("Settings saved locally", {
              description: "Backend sync is not connected yet.",
            })
          }
        >
          Save
        </Button>
      </SectionCard>
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
    <div>
      <label className="text-xs font-medium">{label}</label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
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
