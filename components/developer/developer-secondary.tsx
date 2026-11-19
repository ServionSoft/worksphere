"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessagingInbox } from "@/components/messaging/messaging-inbox";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRequiredAuth } from "@/lib/auth-store";
import { DEMO_TS, demoId } from "@/lib/demo-clock";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { DeveloperProfile } from "@/lib/portal-types";
import { toast } from "sonner";

const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type CvMeta = NonNullable<DeveloperProfile["cvMeta"]>;

function validateCvFile(file: File): string | null {
  if (!CV_ACCEPT.includes(file.type) && !/\.(pdf|doc|docx)$/i.test(file.name)) {
    return "CV must be a PDF or Word document";
  }
  if (file.size <= 0 || file.size > CV_MAX_BYTES) {
    return "CV must be between 1 byte and 5 MB";
  }
  return null;
}

function CvMetaField({
  value,
  onChange,
}: {
  value: CvMeta | null | undefined;
  onChange: (next: CvMeta | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    const error = validateCvFile(file);
    if (error) {
      toast.error(error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || "application/octet-stream",
      selectedAt: DEMO_TS,
    });
    toast.success("CV metadata saved locally", {
      description: "Demo only — file bytes are not uploaded to cloud storage.",
    });
  }

  return (
    <div className="rounded-lg border border-border px-3 py-3">
      <p className="text-xs font-medium">CV (metadata only)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        PDF or Word · max 5 MB · stored as local demo metadata, not cloud storage.
      </p>
      {value ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{value.fileName}</Badge>
          <span className="text-xs text-muted-foreground">
            {(value.fileSize / 1024).toFixed(1)} KB
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Replace
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Remove
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          className="mt-2"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          Select CV
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}

export function DeveloperSubmissionsPage() {
  const { user } = useRequiredAuth();
  const { assignments, workSubmissions } = useWorkspaceStore();
  const mine = assignments.filter((a) => a.developerId === user.developerId);
  const ids = new Set(mine.map((a) => a.id));
  const items = workSubmissions.filter(
    (w) => w.assignmentId != null && ids.has(w.assignmentId)
  );

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
  const { earnings, developers } = useWorkspaceStore();
  const profile = developers.find((d) => d.id === user.developerId);
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

      <SectionCard title="Performance">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Rating" value={profile ? String(profile.rating) : "—"} />
          <Stat
            label="On-time %"
            value={profile ? `${profile.onTimePercent}%` : "—"}
          />
          <Stat
            label="Completed assignments"
            value={profile ? String(profile.completedAssignments) : "—"}
          />
        </div>
        {profile ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Lifetime earnings on profile:{" "}
            {formatCurrency(profile.totalEarnings)}
          </p>
        ) : null}
      </SectionCard>

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
                  Status: <span className="capitalize">{e.status}</span> ·{" "}
                  {formatDate(e.earnedAt)}
                  {e.paidAt ? ` · paid ${formatDate(e.paidAt)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">
                  {formatCurrency(e.amount, e.currency)}
                </p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {e.status}
                </Badge>
              </div>
            </li>
          ))}
          {mine.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No payment records yet.
            </li>
          ) : null}
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
          <div className="mt-3">
            <CvMetaField
              value={form.cvMeta}
              onChange={(next) => setForm((p) => ({ ...p, cvMeta: next }))}
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
  const router = useRouter();
  const { registerDeveloper } = useWorkspaceStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [cvMeta, setCvMeta] = useState<CvMeta | null>(null);
  const [skills, setSkills] = useState("React, TypeScript");
  const [bio, setBio] = useState("");

  function validateStep(current: number): boolean {
    if (current === 1) {
      if (!name.trim() || !email.trim()) {
        toast.error("Name and email are required");
        return false;
      }
    }
    if (current === 2) {
      if (!title.trim() || !phone.trim() || !country.trim()) {
        toast.error("Title, phone, and country are required");
        return false;
      }
    }
    return true;
  }

  function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      setStep(1);
      return;
    }
    if (!title.trim() || !phone.trim() || !country.trim()) {
      toast.error("Title, phone, and country are required");
      setStep(2);
      return;
    }
    if (!skills.trim()) {
      toast.error("Add at least one skill");
      setStep(3);
      return;
    }
    if (!bio.trim()) {
      toast.error("Bio is required");
      setStep(5);
      return;
    }

    registerDeveloper({
      id: demoId("dev"),
      userId: demoId("du"),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      country: country.trim(),
      title: title.trim(),
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      experienceYears: 1,
      hourlyRate: 50,
      availability: "available",
      portfolioUrl: portfolioUrl.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      cvMeta,
      bio: bio.trim(),
      status: "pending_verification",
      rating: 0,
      completedAssignments: 0,
      onTimePercent: 0,
      totalEarnings: 0,
    });
    toast.success("Verification request submitted", {
      description:
        "Sign in after an administrator verifies your profile to access the marketplace.",
    });
    router.push("/login?portal=developer");
  }

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
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Country" value={country} onChange={setCountry} />
          </div>
        ) : null}
        {step === 3 ? (
          <Field label="Skills (comma separated)" value={skills} onChange={setSkills} />
        ) : null}
        {step === 4 ? (
          <div className="grid max-w-lg gap-3">
            <Field
              label="Portfolio URL"
              value={portfolioUrl}
              onChange={setPortfolioUrl}
            />
            <Field label="GitHub URL" value={githubUrl} onChange={setGithubUrl} />
            <CvMetaField value={cvMeta} onChange={setCvMeta} />
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
            marketplace access is granted. You will then sign in via the developer portal.
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
            <Button
              onClick={() => {
                if (!validateStep(step)) return;
                setStep((s) => s + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit}>Submit for verification</Button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

export function DeveloperMessagesPage() {
  return <MessagingInbox portal="developer" />;
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
  const [displayName, setDisplayName] = useLocalStorage(
    "worksphere.developer.displayName",
    user.name
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" description="Developer account preferences (demo)." />
      <SectionCard title="Account">
        <div className="flex max-w-md flex-col gap-3">
          <label className="text-xs font-medium">Display name preference</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Button
            className="w-fit"
            onClick={() => {
              setDisplayName(displayName.trim() || user.name);
              toast.success("Settings saved locally", {
                description: "Display name preference stored in this browser.",
              });
            }}
          >
            Save
          </Button>
        </div>
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
