"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  fetchPreferences,
  patchPreferences,
  type NotificationPreferences,
  type ProfilePreferences,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { isApiDataSource } from "@/lib/data-source";
import { toast } from "sonner";

const CATEGORY_LABELS: Array<{
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  locked?: boolean;
}> = [
  { key: "projects", label: "Projects", description: "Created, status, deadlines" },
  { key: "taskUpdates", label: "Tasks", description: "Status changes and blocked work" },
  { key: "milestones", label: "Milestones", description: "Created, completed, delayed" },
  { key: "assignments", label: "Assignments", description: "Task and marketplace awards" },
  {
    key: "submissionFeedback",
    label: "Submission updates",
    description: "Internal feedback on your work",
  },
  {
    key: "revisionRequests",
    label: "Revision requests",
    description: "Admin or client revisions",
  },
  { key: "approvals", label: "Approvals", description: "Review queues and decisions" },
  {
    key: "marketplaceOpportunities",
    label: "Marketplace opportunities",
    description: "New listings and deadlines",
  },
  { key: "bidUpdates", label: "Bid updates", description: "Shortlist, reject, clarifications" },
  { key: "messages", label: "Messages", description: "Direct and project conversations" },
  { key: "earnings", label: "Earnings", description: "Recorded and paid earnings" },
  { key: "finance", label: "Finance", description: "Invoices, payments, change orders" },
  { key: "account", label: "Account", description: "Invites and membership changes" },
  {
    key: "securityAlerts",
    label: "Security alerts",
    description: "Always on — cannot be disabled",
    locked: true,
  },
];

const DEFAULTS: NotificationPreferences = {
  projects: true,
  taskUpdates: true,
  milestones: true,
  assignments: true,
  submissionFeedback: true,
  revisionRequests: true,
  approvals: true,
  marketplaceOpportunities: true,
  bidUpdates: true,
  messages: true,
  earnings: true,
  finance: true,
  account: true,
  securityAlerts: true,
  channels: { inApp: true, email: false },
  email: {
    projects: true,
    taskUpdates: true,
    milestones: true,
    assignments: true,
    submissionFeedback: true,
    revisionRequests: true,
    approvals: true,
    marketplaceOpportunities: true,
    bidUpdates: true,
    messages: true,
    earnings: true,
    finance: true,
    account: true,
    securityAlerts: true,
  },
};

export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [missingEnv, setMissingEnv] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isApiDataSource()) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const data: ProfilePreferences = await fetchPreferences();
        setPrefs({
          ...DEFAULTS,
          ...data.notifications,
          channels: {
            ...DEFAULTS.channels,
            ...data.notifications.channels,
          },
          email: {
            ...DEFAULTS.email,
            ...data.notifications.email,
          },
        });
        setEmailConfigured(Boolean(data.emailDelivery?.configured));
        setMissingEnv(data.emailDelivery?.missingEnv ?? []);
      } catch (err) {
        toast.error(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "Failed to load preferences"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    if (!isApiDataSource()) {
      toast.message("Demo mode — preferences are not persisted to the API");
      return;
    }
    setSaving(true);
    try {
      const data = await patchPreferences({
        notifications: {
          ...prefs,
          securityAlerts: true,
          channels: {
            inApp: prefs.channels.inApp,
            email: emailConfigured ? prefs.channels.email : false,
          },
          email: { ...prefs.email, securityAlerts: true },
        },
      });
      setPrefs({
        ...DEFAULTS,
        ...data.notifications,
        channels: {
          ...DEFAULTS.channels,
          ...data.notifications.channels,
        },
        email: { ...DEFAULTS.email, ...data.notifications.email },
      });
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Save failed"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SectionCard title="Notification preferences">
        <p className="text-sm text-muted-foreground">Loading preferences…</p>
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Delivery channels"
        description="In-app alerts always use your category toggles. Email requires a configured provider."
      >
        <ul className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
            <span>In-app notifications</span>
            <Checkbox
              checked={prefs.channels.inApp}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({
                  ...p,
                  channels: { ...p.channels, inApp: Boolean(checked) },
                }))
              }
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
            <span>
              Email notifications
              {!emailConfigured ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Unavailable — configure{" "}
                  {missingEnv.slice(0, 3).join(", ") || "RESEND_API_KEY or SMTP_*"}
                </span>
              ) : null}
            </span>
            <Checkbox
              checked={emailConfigured && prefs.channels.email}
              disabled={!emailConfigured}
              onCheckedChange={(checked) =>
                setPrefs((p) => ({
                  ...p,
                  channels: { ...p.channels, email: Boolean(checked) },
                }))
              }
            />
          </label>
        </ul>
      </SectionCard>

      <SectionCard
        title="Categories"
        description="Choose which events create in-app notifications. Security alerts cannot be turned off."
      >
        <ul className="flex flex-col gap-3">
          {CATEGORY_LABELS.map((item) => {
            if (item.key === "channels" || item.key === "email") return null;
            const key = item.key as keyof typeof DEFAULTS;
            if (key === "channels" || key === "email") return null;
            const checked = Boolean(prefs[key]);
            return (
              <label
                key={String(item.key)}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm"
              >
                <span>
                  {item.label}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                <Checkbox
                  checked={checked}
                  disabled={item.locked}
                  onCheckedChange={(value) =>
                    setPrefs((p) => ({
                      ...p,
                      [item.key]: item.locked ? true : Boolean(value),
                    }))
                  }
                />
              </label>
            );
          })}
        </ul>
        <Button className="mt-4" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </SectionCard>
    </div>
  );
}
