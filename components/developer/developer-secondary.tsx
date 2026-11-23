"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessagingInbox } from "@/components/messaging/messaging-inbox";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getApiDeveloper } from "@/lib/api/workspace-api";
import { onboard } from "@/lib/api/auth";
import { useAuth, useRequiredAuth } from "@/lib/auth-store";
import { isApiDataSource } from "@/lib/data-source";
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
  const { refreshMe } = useAuth();
  const {
    developers,
    updateDeveloperProfile,
    hydrated,
  } = useWorkspaceStore();
  // Keep a fallback copy when workspace bootstrap has not loaded developers yet.
  const [localProfile, setLocalProfile] = useState<DeveloperProfile | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skillsText, setSkillsText] = useState("");
  const profile =
    developers.find((d) => d.id === user.developerId) ?? localProfile;
  const [form, setForm] = useState<Partial<DeveloperProfile>>({});

  useEffect(() => {
    if (!profile) return;
    setForm(profile);
    setSkillsText(profile.skills.join(", "));
  }, [profile?.id]);

  useEffect(() => {
    let cancelled = false;
    async function ensureProfile() {
      if (!isApiDataSource() || !hydrated) return;
      if (user.developerId && developers.some((d) => d.id === user.developerId)) {
        return;
      }
      if (localProfile) return;

      setLoading(true);
      try {
        let developerId = user.developerId;
        if (!developerId) {
          await onboard({ kind: "developer", developer: {} });
          await refreshMe();
          const { fetchMe } = await import("@/lib/api/auth");
          const me = await fetchMe();
          developerId = me.profile.developerProfileId ?? undefined;
        }
        if (!developerId) {
          if (!cancelled) setLocalProfile(null);
          return;
        }
        const self = await getApiDeveloper(developerId);
        if (!cancelled) {
          setLocalProfile(self);
          setForm(self);
          setSkillsText(self.skills.join(", "));
        }
      } catch {
        if (!cancelled) setLocalProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void ensureProfile();
    return () => {
      cancelled = true;
    };
  }, [hydrated, developers, localProfile, user.developerId, refreshMe]);

  if (loading || (!hydrated && isApiDataSource())) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading your profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="font-semibold">No developer profile</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is signed in, but a developer profile was not created yet.
          Complete registration or try again after email verification.
        </p>
        <Button
          className="mt-4"
          render={<Link href="/developer/register" />}
          nativeButton={false}
        >
          Start registration
        </Button>
      </div>
    );
  }

  function saveProfile(extra?: { requestReview?: boolean }) {
    if (!profile) return;
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!form.title?.trim()) {
      toast.error("Professional title is required");
      return;
    }
    setSaving(true);
    updateDeveloperProfile(profile.id, {
      ...form,
      title: form.title.trim(),
      skills,
      phone: form.phone ?? "",
      country: form.country ?? "",
      bio: form.bio ?? "",
      experienceYears: Number(form.experienceYears) || 0,
      hourlyRate: Number(form.hourlyRate) || 0,
      portfolioUrl: form.portfolioUrl?.trim() || "",
      githubUrl: form.githubUrl?.trim() || "",
      linkedinUrl: form.linkedinUrl?.trim() || "",
      ...extra,
    });
    setLocalProfile((prev) =>
      prev
        ? {
            ...prev,
            ...form,
            skills,
            title: form.title!.trim(),
          }
        : prev
    );
    toast.success(
      extra?.requestReview ? "Re-review requested" : "Profile saved"
    );
    window.setTimeout(() => setSaving(false), 600);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Profile"
        description={`Status: ${profile.status.replace(/_/g, " ")} · Edit and save your professional details anytime.`}
      />
      {profile.status === "pending_verification" ? (
        <SectionCard title="Verification pending">
          <p className="text-sm text-muted-foreground">
            Your profile is waiting for admin review. You can keep updating your
            information — admins will see the latest details.
          </p>
        </SectionCard>
      ) : null}
      {profile.status === "rejected" ? (
        <SectionCard title="Verification feedback">
          <p className="text-sm text-muted-foreground">
            {profile.verificationNote ||
              "Your application was rejected. Update your profile and request another review."}
          </p>
          <Button
            className="mt-3"
            size="sm"
            disabled={saving}
            onClick={() => saveProfile({ requestReview: true })}
          >
            Request re-review
          </Button>
        </SectionCard>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Overview" className="xl:col-span-1">
          <p className="text-sm font-medium">{profile.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{profile.email}</p>
          <p className="mt-3 text-sm">
            Rating: <strong>{profile.rating}</strong>
          </p>
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
              label="Professional title"
              value={form.title ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, title: v }))}
            />
            <Field
              label="Phone"
              value={form.phone ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            />
            <Field
              label="Country"
              value={form.country ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, country: v }))}
            />
            <Field
              label="Years of experience"
              value={String(form.experienceYears ?? "")}
              onChange={(v) =>
                setForm((p) => ({
                  ...p,
                  experienceYears: Number(v) || 0,
                }))
              }
            />
            <Field
              label="Hourly rate (USD)"
              value={String(form.hourlyRate ?? "")}
              onChange={(v) =>
                setForm((p) => ({ ...p, hourlyRate: Number(v) || 0 }))
              }
            />
            <div>
              <label className="text-xs font-medium">Availability</label>
              <Select
                value={form.availability ?? "available"}
                onValueChange={(v) =>
                  typeof v === "string" &&
                  setForm((p) => ({
                    ...p,
                    availability: v as DeveloperProfile["availability"],
                  }))
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field
              label="Portfolio URL"
              value={form.portfolioUrl ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, portfolioUrl: v }))}
            />
            <Field
              label="GitHub URL"
              value={form.githubUrl ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, githubUrl: v }))}
            />
            <Field
              label="LinkedIn URL"
              value={form.linkedinUrl ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, linkedinUrl: v }))}
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium">
              Skills (comma-separated)
            </label>
            <Input
              className="mt-1"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="React, TypeScript, Node.js"
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
            rows={5}
            value={form.bio ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Tell admins about your stack and experience"
          />
          <Button
            className="mt-4"
            disabled={saving}
            onClick={() => saveProfile()}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </SectionCard>
      </div>
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
