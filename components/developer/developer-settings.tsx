"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import {
  fetchMe,
  fetchPreferences,
  patchMe,
  patchPreferences,
  type ApplicationPreferences,
  type NotificationCategoryPreferences,
  type NotificationPreferences,
  type ProfilePreferences,
} from "@/lib/api/auth";
import { getApiDeveloper, patchApiDeveloper } from "@/lib/api/workspace-api";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { useAuth, useRequiredAuth } from "@/lib/auth-store";
import { isApiDataSource } from "@/lib/data-source";
import { formatDate } from "@/lib/format";
import type { DeveloperProfile } from "@/lib/portal-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PayoutAccountsPanel } from "@/components/developer/payout-accounts-panel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SettingsSection =
  | "account"
  | "professional"
  | "payout"
  | "security"
  | "notifications"
  | "preferences"
  | "verification"
  | "danger";

const SECTIONS: Array<{ id: SettingsSection; label: string; hint: string }> = [
  { id: "account", label: "Account", hint: "Identity & contact" },
  { id: "professional", label: "Professional", hint: "Public talent profile" },
  {
    id: "payout",
    label: "Payout methods",
    hint: "Bank / JazzCash / Easypaisa",
  },
  { id: "security", label: "Security", hint: "Password & sessions" },
  { id: "notifications", label: "Notifications", hint: "In-app alerts" },
  { id: "preferences", label: "Preferences", hint: "Theme & formats" },
  { id: "verification", label: "Verification", hint: "Status & next steps" },
  { id: "danger", label: "Danger zone", hint: "Sign out & requests" },
];

const NOTIFICATION_ITEMS: Array<{
  key: keyof NotificationCategoryPreferences;
  label: string;
  description: string;
  locked?: boolean;
}> = [
  {
    key: "marketplaceOpportunities",
    label: "Marketplace opportunities",
    description: "New and updated opportunities matching your skills",
  },
  {
    key: "bidUpdates",
    label: "Bid updates",
    description: "Shortlists, rejections, and bid status changes",
  },
  {
    key: "assignments",
    label: "Project assignments",
    description: "Awards and assignment confirmations",
  },
  {
    key: "taskUpdates",
    label: "Task updates",
    description: "Task assignments and schedule changes",
  },
  {
    key: "submissionFeedback",
    label: "Submission feedback",
    description: "Reviews on work you submit",
  },
  {
    key: "revisionRequests",
    label: "Revision requests",
    description: "Requested changes on submissions",
  },
  {
    key: "approvals",
    label: "Approval updates",
    description: "Approvals and final decisions",
  },
  {
    key: "messages",
    label: "Messages",
    description: "New workspace messages",
  },
  {
    key: "earnings",
    label: "Earnings & payments",
    description: "Payment and earnings activity",
  },
  {
    key: "securityAlerts",
    label: "Account & security alerts",
    description: "Always on for account safety",
    locked: true,
  },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  helper,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  helper?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium">{label}</label>
      <Input
        className="mt-1"
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper ? (
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function profileCompletion(dev: DeveloperProfile | null): {
  percent: number;
  missing: string[];
} {
  if (!dev) return { percent: 0, missing: ["Developer profile"] };
  const checks: Array<[string, boolean]> = [
    ["Professional title", Boolean(dev.title?.trim())],
    ["Bio", Boolean(dev.bio?.trim())],
    ["Skills", dev.skills.length > 0],
    ["Phone", Boolean(dev.phone?.trim())],
    ["Experience", Number(dev.experienceYears) > 0],
    ["Portfolio or LinkedIn", Boolean(dev.portfolioUrl || dev.linkedinUrl)],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  const percent = Math.round(
    ((checks.length - missing.length) / checks.length) * 100
  );
  return { percent, missing };
}

export function DeveloperSettingsPage() {
  const { user } = useRequiredAuth();
  const { logout, refreshMe, requestPasswordReset } = useAuth();
  const { setTheme } = useTheme();
  const apiMode = isApiDataSource();

  const [section, setSection] = useState<SettingsSection>("account");
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPro, setSavingPro] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [dangerBusy, setDangerBusy] = useState(false);

  const [fullName, setFullName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accountTitle, setAccountTitle] = useState(user.title ?? "");
  const [email, setEmail] = useState(user.email);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);
  const [proForm, setProForm] = useState<Partial<DeveloperProfile>>({});
  const [skillsText, setSkillsText] = useState("");

  const [prefs, setPrefs] = useState<ProfilePreferences | null>(null);
  const [notifDraft, setNotifDraft] = useState<NotificationPreferences | null>(
    null
  );
  const [appDraft, setAppDraft] = useState<ApplicationPreferences | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [accountDirty, setAccountDirty] = useState(false);
  const [proDirty, setProDirty] = useState(false);
  const [notifDirty, setNotifDirty] = useState(false);
  const [appDirty, setAppDirty] = useState(false);

  const [deactivateConfirm, setDeactivateConfirm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const completion = useMemo(
    () => profileCompletion(developer),
    [developer]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      if (!apiMode) {
        setFullName(user.name);
        setEmail(user.email);
        setAccountTitle(user.title ?? "");
        setEmailConfirmed(true);
        setLoading(false);
        return;
      }

      const [me, preferences] = await Promise.all([
        fetchMe(),
        fetchPreferences(),
      ]);
      setFullName(me.profile.fullName);
      setEmail(me.profile.email);
      setAccountTitle(me.profile.title ?? "");
      setAvatarUrl(me.profile.avatarUrl ?? "");
      setCreatedAt(me.profile.createdAt ?? null);
      setPrefs(preferences);
      setNotifDraft(preferences.notifications);
      setAppDraft(preferences.application);
      setTheme(preferences.application.theme);

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        setEmailConfirmed(Boolean(data.user?.email_confirmed_at));
        const pending =
          typeof data.user?.new_email === "string" ? data.user.new_email : null;
        setPendingEmail(pending);
      }

      const developerId =
        me.profile.developerProfileId ?? user.developerId ?? null;
      if (developerId) {
        try {
          const self = await getApiDeveloper(developerId);
          setDeveloper(self);
          setProForm(self);
          setSkillsText(self.skills.join(", "));
        } catch {
          setDeveloper(null);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [apiMode, setTheme, user.developerId, user.email, user.name, user.title]);

  useEffect(() => {
    // Initial hydrate from /api/auth/me + preferences + developer profile.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount fetch
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (accountDirty || proDirty || notifDirty || appDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [accountDirty, proDirty, notifDirty, appDirty]);

  async function saveAccount() {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!apiMode) {
      toast.message("Demo mode — account changes are not persisted to the API");
      return;
    }
    setSavingAccount(true);
    try {
      await patchMe({
        fullName: fullName.trim(),
        title: accountTitle.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      await refreshMe();
      setAccountDirty(false);
      toast.success("Account details saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save account");
    } finally {
      setSavingAccount(false);
    }
  }

  async function saveProfessional() {
    if (!developer) {
      toast.error("No developer profile to update");
      return;
    }
    if (!proForm.title?.trim()) {
      toast.error("Professional title is required");
      return;
    }
    if (!apiMode) {
      toast.message("Demo mode — profile changes are local only");
      return;
    }
    setSavingPro(true);
    try {
      const skills = skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await patchApiDeveloper(developer.id, {
        title: proForm.title.trim(),
        bio: proForm.bio ?? "",
        phone: proForm.phone ?? "",
        country: proForm.country ?? "",
        skills,
        experienceYears: Number(proForm.experienceYears) || 0,
        hourlyRate: Number(proForm.hourlyRate) || 0,
        availability: proForm.availability ?? "available",
        portfolioUrl: proForm.portfolioUrl?.trim() || "",
        githubUrl: proForm.githubUrl?.trim() || "",
        linkedinUrl: proForm.linkedinUrl?.trim() || "",
      });
      await patchMe({ title: proForm.title.trim() });
      setDeveloper(updated);
      setProForm(updated);
      setSkillsText(updated.skills.join(", "));
      setAccountTitle(proForm.title.trim());
      await refreshMe();
      setProDirty(false);
      toast.success("Professional profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSavingPro(false);
    }
  }

  async function saveNotifications() {
    if (!notifDraft || !apiMode) return;
    setSavingNotifs(true);
    try {
      const next = await patchPreferences({
        notifications: { ...notifDraft, securityAlerts: true },
      });
      setPrefs(next);
      setNotifDraft(next.notifications);
      setNotifDirty(false);
      toast.success("Notification preferences saved");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save notifications"
      );
    } finally {
      setSavingNotifs(false);
    }
  }

  async function saveApplicationPrefs() {
    if (!appDraft || !apiMode) return;
    setSavingPrefs(true);
    try {
      const next = await patchPreferences({ application: appDraft });
      setPrefs(next);
      setAppDraft(next.application);
      setTheme(next.application.theme);
      setAppDirty(false);
      toast.success("Preferences saved");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save preferences"
      );
    } finally {
      setSavingPrefs(false);
    }
  }

  async function changePassword() {
    if (!apiMode) {
      toast.message("Password changes require Supabase Auth (API mode)");
      return;
    }
    if (!currentPassword || !newPassword) {
      toast.error("Enter your current and new password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Supabase is not configured");
      return;
    }
    setSavingPassword(true);
    try {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthErr) {
        toast.error("Current password is incorrect");
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } finally {
      setSavingPassword(false);
    }
  }

  async function requestEmailChange() {
    if (!apiMode) {
      toast.message("Email change requires Supabase Auth (API mode)");
      return;
    }
    const next = newEmail.trim().toLowerCase();
    if (!next || !next.includes("@")) {
      toast.error("Enter a valid new email");
      return;
    }
    if (next === email.toLowerCase()) {
      toast.error("New email must be different");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Supabase is not configured");
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: next },
        { emailRedirectTo: authCallbackUrl("/developer/settings") }
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      setPendingEmail(next);
      setNewEmail("");
      toast.success("Verification email sent", {
        description:
          "Confirm the change from both your current and new inbox if prompted.",
      });
    } finally {
      setSavingEmail(false);
    }
  }

  async function sendPasswordRecovery() {
    const result = await requestPasswordReset(email);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }

  async function signOutAllSessions() {
    if (!apiMode) {
      logout();
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      logout();
      return;
    }
    setDangerBusy(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
      logout();
    } catch {
      logout();
    } finally {
      setDangerBusy(false);
    }
  }

  async function requestAccountAction(kind: "deactivation" | "deletion") {
    if (!apiMode) {
      toast.message("Account requests require API mode");
      return;
    }
    const expected = kind === "deletion" ? "DELETE" : "DEACTIVATE";
    const typed =
      kind === "deletion" ? deleteConfirm : deactivateConfirm;
    if (typed !== expected) {
      toast.error(`Type ${expected} to confirm`);
      return;
    }
    setDangerBusy(true);
    try {
      const next = await patchPreferences(
        kind === "deletion"
          ? { requestDeletion: true }
          : { requestDeactivation: true }
      );
      setPrefs(next);
      if (kind === "deletion") setDeleteConfirm("");
      else setDeactivateConfirm("");
      toast.success(
        kind === "deletion"
          ? "Deletion request submitted"
          : "Deactivation request submitted",
        {
          description:
            "An administrator will review. Financial and audit records are retained.",
        }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setDangerBusy(false);
    }
  }

  async function clearAccountRequest(kind: "deactivation" | "deletion") {
    if (!apiMode) return;
    setDangerBusy(true);
    try {
      const next = await patchPreferences(
        kind === "deletion"
          ? { clearDeletionRequest: true }
          : { clearDeactivationRequest: true }
      );
      setPrefs(next);
      toast.success("Request cancelled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel request");
    } finally {
      setDangerBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-20 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Manage your WorkSphere developer account, security, and preferences."
      />

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "min-w-[140px] rounded-lg border px-3 py-2.5 text-left transition-colors lg:min-w-0",
                section === item.id
                  ? "border-foreground/20 bg-card shadow-sm"
                  : "border-transparent bg-transparent hover:bg-muted/60"
              )}
            >
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="mt-0.5 hidden text-xs text-muted-foreground lg:block">
                {item.hint}
              </p>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          {section === "account" ? (
            <SectionCard
              title="Account"
              description="Identity fields stored on your WorkSphere profile. Email changes require Supabase verification."
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!accountDirty || savingAccount}
                    onClick={() => {
                      void loadAll();
                      setAccountDirty(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!accountDirty || savingAccount}
                    onClick={() => void saveAccount()}
                  >
                    {savingAccount ? (
                      <>
                        <Loader2 className="animate-spin" data-icon="inline-start" />
                        Saving…
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Full name"
                  value={fullName}
                  helper="Used as your display name across the portal"
                  onChange={(v) => {
                    setFullName(v);
                    setAccountDirty(true);
                  }}
                />
                <Field
                  label="Job title (profile)"
                  value={accountTitle}
                  helper="Short title on your account card"
                  onChange={(v) => {
                    setAccountTitle(v);
                    setAccountDirty(true);
                  }}
                />
                <Field
                  label="Email address"
                  value={email}
                  disabled
                  helper="Change email below — verification required"
                  onChange={() => undefined}
                />
                <Field
                  label="Avatar URL"
                  value={avatarUrl}
                  placeholder="https://…"
                  helper="HTTPS image URL (upload storage not enabled)"
                  onChange={(v) => {
                    setAvatarUrl(v);
                    setAccountDirty(true);
                  }}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Account created</p>
                  <p className="mt-1 text-sm font-medium">
                    {createdAt ? formatDate(createdAt) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Account status</p>
                  <p className="mt-1 text-sm font-medium">Active</p>
                </div>
                <div className="rounded-lg border border-border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Email verification</p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                    {emailConfirmed ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-3.5 text-amber-600" />
                        Unverified
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Change email</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supabase sends a confirmation link. Your profile email updates
                  after you confirm and refresh the session.
                </p>
                {pendingEmail ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                    Pending change to <strong>{pendingEmail}</strong>
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field
                      label="New email"
                      type="email"
                      value={newEmail}
                      onChange={setNewEmail}
                    />
                  </div>
                  <Button
                    disabled={savingEmail || !newEmail.trim()}
                    onClick={() => void requestEmailChange()}
                  >
                    {savingEmail ? "Sending…" : "Send verification"}
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {section === "professional" ? (
            <SectionCard
              title="Professional profile"
              description="Updates your developer talent profile used for marketplace and admin review."
              action={
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!proDirty || savingPro}
                    onClick={() => {
                      if (developer) {
                        setProForm(developer);
                        setSkillsText(developer.skills.join(", "));
                      }
                      setProDirty(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!developer || !proDirty || savingPro}
                    onClick={() => void saveProfessional()}
                  >
                    {savingPro ? "Saving…" : "Save profile"}
                  </Button>
                </div>
              }
            >
              {!developer ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No developer profile yet.{" "}
                  <Link
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                    href="/developer/register"
                  >
                    Complete registration
                  </Link>{" "}
                  or open{" "}
                  <Link
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                    href="/developer/profile"
                  >
                    My Profile
                  </Link>
                  .
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {developer.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Profile completion {completion.percent}%
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Professional title"
                      value={proForm.title ?? ""}
                      onChange={(v) => {
                        setProForm((p) => ({ ...p, title: v }));
                        setProDirty(true);
                      }}
                    />
                    <Field
                      label="Phone"
                      value={proForm.phone ?? ""}
                      onChange={(v) => {
                        setProForm((p) => ({ ...p, phone: v }));
                        setProDirty(true);
                      }}
                    />
                    <Field
                      label="Country"
                      value={proForm.country ?? ""}
                      onChange={(v) => {
                        setProForm((p) => ({ ...p, country: v }));
                        setProDirty(true);
                      }}
                    />
                    <Field
                      label="Years of experience"
                      value={String(proForm.experienceYears ?? "")}
                      onChange={(v) => {
                        setProForm((p) => ({
                          ...p,
                          experienceYears: Number(v) || 0,
                        }));
                        setProDirty(true);
                      }}
                    />
                    <Field
                      label="Hourly rate (USD)"
                      value={String(proForm.hourlyRate ?? "")}
                      onChange={(v) => {
                        setProForm((p) => ({
                          ...p,
                          hourlyRate: Number(v) || 0,
                        }));
                        setProDirty(true);
                      }}
                    />
                    <div>
                      <label className="text-xs font-medium">Availability</label>
                      <Select
                        value={proForm.availability ?? "available"}
                        onValueChange={(v) => {
                          if (typeof v !== "string") return;
                          setProForm((p) => ({
                            ...p,
                            availability:
                              v as DeveloperProfile["availability"],
                          }));
                          setProDirty(true);
                        }}
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                          <SelectItem value="unavailable">
                            Unavailable
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Field
                      label="Portfolio / website"
                      value={proForm.portfolioUrl ?? ""}
                      onChange={(v) => {
                        setProForm((p) => ({ ...p, portfolioUrl: v }));
                        setProDirty(true);
                      }}
                    />
                    <Field
                      label="GitHub"
                      value={proForm.githubUrl ?? ""}
                      onChange={(v) => {
                        setProForm((p) => ({ ...p, githubUrl: v }));
                        setProDirty(true);
                      }}
                    />
                    <Field
                      label="LinkedIn"
                      value={proForm.linkedinUrl ?? ""}
                      onChange={(v) => {
                        setProForm((p) => ({ ...p, linkedinUrl: v }));
                        setProDirty(true);
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-medium">
                      Skills (comma-separated)
                    </label>
                    <Input
                      className="mt-1"
                      value={skillsText}
                      onChange={(e) => {
                        setSkillsText(e.target.value);
                        setProDirty(true);
                      }}
                      placeholder="React, TypeScript, Node.js"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-medium">Bio</label>
                    <Textarea
                      className="mt-1"
                      rows={5}
                      value={proForm.bio ?? ""}
                      onChange={(e) => {
                        setProForm((p) => ({ ...p, bio: e.target.value }));
                        setProDirty(true);
                      }}
                    />
                  </div>
                </>
              )}
            </SectionCard>
          ) : null}

          {section === "payout" ? <PayoutAccountsPanel /> : null}

          {section === "security" ? (
            <div className="space-y-4">
              <SectionCard
                title="Password"
                description="Verified against your current credentials, then updated via Supabase Auth."
              >
                <div className="grid max-w-lg gap-3">
                  <Field
                    label="Current password"
                    type="password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                  />
                  <Field
                    label="New password"
                    type="password"
                    value={newPassword}
                    onChange={setNewPassword}
                    helper="Minimum 8 characters"
                  />
                  <Field
                    label="Confirm new password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={savingPassword}
                      onClick={() => void changePassword()}
                    >
                      {savingPassword ? "Updating…" : "Update password"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void sendPasswordRecovery()}
                    >
                      Send recovery email
                    </Button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Sessions"
                description="Sign out of this browser or revoke all Supabase refresh sessions for this account."
              >
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => logout()}>
                    Sign out of this session
                  </Button>
                  <Button
                    variant="outline"
                    disabled={dangerBusy}
                    onClick={() => void signOutAllSessions()}
                  >
                    Sign out of all sessions
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Active session listing beyond the current client is not exposed
                  by the Auth API used here. Global sign-out revokes refresh
                  tokens via Supabase.
                </p>
              </SectionCard>

              <SectionCard title="Email verification">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="size-4 text-muted-foreground" />
                  {emailConfirmed
                    ? "Your login email is verified with Supabase Auth."
                    : "Your login email is not verified yet. Check your inbox or re-register confirmation."}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {section === "notifications" ? (
            <SectionCard
              title="In-app notifications"
              description="These preferences are stored on your account and enforced for marketplace bid/assignment alerts. Email delivery is not enabled for these categories."
              action={
                <Button
                  size="sm"
                  disabled={!notifDirty || savingNotifs || !notifDraft}
                  onClick={() => void saveNotifications()}
                >
                  {savingNotifs ? "Saving…" : "Save"}
                </Button>
              }
            >
              {!notifDraft ? (
                <p className="text-sm text-muted-foreground">
                  Preferences unavailable.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {NOTIFICATION_ITEMS.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <Checkbox
                        checked={Boolean(notifDraft[item.key])}
                        disabled={item.locked}
                        onCheckedChange={(checked) => {
                          if (item.locked) return;
                          setNotifDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  [item.key]: Boolean(checked),
                                  securityAlerts: true,
                                  channels: prev.channels ?? {
                                    inApp: true,
                                    email: false,
                                  },
                                  email: prev.email ?? prev,
                                }
                              : prev
                          );
                          setNotifDirty(true);
                        }}
                      />
                    </label>
                  ))}
                </ul>
              )}
            </SectionCard>
          ) : null}

          {section === "preferences" ? (
            <SectionCard
              title="Application preferences"
              description="Theme applies immediately via next-themes. Timezone and date/time formats are stored for your account."
              action={
                <Button
                  size="sm"
                  disabled={!appDirty || savingPrefs || !appDraft}
                  onClick={() => void saveApplicationPrefs()}
                >
                  {savingPrefs ? "Saving…" : "Save"}
                </Button>
              }
            >
              {!appDraft ? (
                <p className="text-sm text-muted-foreground">
                  Preferences unavailable.
                </p>
              ) : (
                <div className="grid max-w-xl gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium">Theme</label>
                    <Select
                      value={appDraft.theme}
                      onValueChange={(v) => {
                        if (
                          v !== "system" &&
                          v !== "light" &&
                          v !== "dark"
                        )
                          return;
                        setAppDraft((p) => (p ? { ...p, theme: v } : p));
                        setTheme(v);
                        setAppDirty(true);
                      }}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Timezone</label>
                    <Select
                      value={appDraft.timezone}
                      onValueChange={(v) => {
                        if (typeof v !== "string") return;
                        setAppDraft((p) =>
                          p ? { ...p, timezone: v } : p
                        );
                        setAppDirty(true);
                      }}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Date format</label>
                    <Select
                      value={appDraft.dateFormat}
                      onValueChange={(v) => {
                        if (v !== "ymd" && v !== "mdy" && v !== "dmy") return;
                        setAppDraft((p) =>
                          p ? { ...p, dateFormat: v } : p
                        );
                        setAppDirty(true);
                      }}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                        <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Time format</label>
                    <Select
                      value={appDraft.timeFormat}
                      onValueChange={(v) => {
                        if (v !== "12h" && v !== "24h") return;
                        setAppDraft((p) =>
                          p ? { ...p, timeFormat: v } : p
                        );
                        setAppDirty(true);
                      }}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24-hour</SelectItem>
                        <SelectItem value="12h">12-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                Language selection is not offered — the product UI is English
                only.
              </p>
            </SectionCard>
          ) : null}

          {section === "verification" ? (
            <div className="space-y-4">
              <SectionCard title="Verification overview">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border px-3 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserRound className="size-3.5" />
                      Developer verification
                    </div>
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {developer
                        ? developer.status.replace(/_/g, " ")
                        : "No profile"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Only workspace admins can approve developer verification.
                      You cannot approve yourself.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border px-3 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="size-3.5" />
                      Email verification
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      {emailConfirmed ? "Verified" : "Unverified"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Separate from admin talent-pool verification.
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Profile completion">
                <p className="text-sm">
                  <strong>{completion.percent}%</strong> complete
                </p>
                {completion.missing.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {completion.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    All recommended fields are filled.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href="/developer/profile" />}
                    nativeButton={false}
                  >
                    Open My Profile
                  </Button>
                  {developer?.status === "rejected" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSection("professional");
                      }}
                    >
                      Update & request re-review
                    </Button>
                  ) : null}
                </div>
                {developer?.status === "rejected" &&
                developer.verificationNote ? (
                  <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                    {developer.verificationNote}
                  </p>
                ) : null}
              </SectionCard>
            </div>
          ) : null}

          {section === "danger" ? (
            <div className="space-y-4">
              <SectionCard
                title="Sign out"
                description="End your current WorkSphere session on this device."
              >
                <Button variant="outline" onClick={() => logout()}>
                  Sign out
                </Button>
              </SectionCard>

              <SectionCard
                title="Account deactivation request"
                description="Requests admin review. Does not delete submissions, earnings, or audit history."
              >
                {prefs?.deactivationRequestedAt ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Requested{" "}
                      {formatDate(prefs.deactivationRequestedAt)}. Waiting for
                      administrator action.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dangerBusy}
                      onClick={() => void clearAccountRequest("deactivation")}
                    >
                      Cancel request
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Field
                      label="Type DEACTIVATE to confirm"
                      value={deactivateConfirm}
                      onChange={setDeactivateConfirm}
                    />
                    <Button
                      variant="outline"
                      disabled={dangerBusy}
                      onClick={() => void requestAccountAction("deactivation")}
                    >
                      Request deactivation
                    </Button>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Account deletion request"
                description="Destructive request only — records required for finance and compliance are retained."
                className="border-destructive/30"
              >
                {prefs?.deletionRequestedAt ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Requested {formatDate(prefs.deletionRequestedAt)}. Waiting
                      for administrator action.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={dangerBusy}
                      onClick={() => void clearAccountRequest("deletion")}
                    >
                      Cancel request
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Field
                      label="Type DELETE to confirm"
                      value={deleteConfirm}
                      onChange={setDeleteConfirm}
                    />
                    <Button
                      variant="destructive"
                      disabled={dangerBusy}
                      onClick={() => void requestAccountAction("deletion")}
                    >
                      Request deletion
                    </Button>
                  </div>
                )}
              </SectionCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
