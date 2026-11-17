"use client";

import { useEffect, useState } from "react";
import {
  fetchPlatformActivity,
  fetchPlatformRevenue,
  fetchPlatformSettings,
  fetchPlatformSubscriptions,
  fetchPlatformTenants,
  updatePlatformSettings,
} from "@/lib/api/platform-api";
import { isApiDataSource } from "@/lib/data-source";
import {
  platformActivity as seedActivity,
  platformSubscriptions as seedSubscriptions,
  platformTenants as seedTenants,
  type PlatformActivity,
  type PlatformSubscription,
  type PlatformTenant,
} from "@/lib/mock-platform";

function mapTenant(row: Record<string, unknown>): PlatformTenant {
  const planRaw = String(row.plan ?? row.planCode ?? "Pro");
  const plan =
    planRaw === "Starter" || planRaw === "Enterprise" || planRaw === "Pro"
      ? planRaw
      : planRaw.toLowerCase().includes("enter")
        ? "Enterprise"
        : planRaw.toLowerCase().includes("start")
          ? "Starter"
          : "Pro";
  const statusRaw = String(row.status ?? "active");
  const status: PlatformTenant["status"] =
    statusRaw === "suspended" || statusRaw === "trial"
      ? statusRaw
      : "active";
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    plan,
    status,
    seats: Number(row.seats ?? 0),
    usedSeats: Number(row.memberCount ?? row.usedSeats ?? 0),
    mrr: Number(row.monthlyPrice ?? row.mrr ?? 0),
    createdAt: String(row.createdAt ?? "").slice(0, 10) || "2026-01-01",
    ownerEmail: String(row.ownerEmail ?? "admin@worksphere.app"),
    projects: Number(row.projectCount ?? row.projects ?? 0),
    developers: Number(row.developers ?? 0),
  };
}

function mapSubscription(row: Record<string, unknown>): PlatformSubscription {
  const statusRaw = String(row.status ?? "active");
  const status: PlatformSubscription["status"] =
    statusRaw === "past_due" || statusRaw === "canceled"
      ? statusRaw
      : "active";
  return {
    id: String(row.id),
    tenantId: String(row.workspaceId ?? row.tenantId ?? ""),
    tenantName: String(row.workspaceName ?? row.tenantName ?? ""),
    plan: String(row.planName ?? row.planCode ?? row.plan ?? ""),
    status,
    renewsAt: String(row.currentPeriodEnd ?? row.renewsAt ?? "").slice(0, 10),
    amount: Number(row.monthlyPrice ?? row.amount ?? 0),
  };
}

function mapActivity(row: Record<string, unknown>): PlatformActivity {
  const severityRaw = String(row.severity ?? "info");
  const severity: PlatformActivity["severity"] =
    severityRaw === "warning" || severityRaw === "critical"
      ? severityRaw
      : "info";
  return {
    id: String(row.id),
    title: String(row.title ?? row.action ?? "Activity"),
    detail: String(row.detail ?? row.description ?? ""),
    at: String(row.at ?? row.createdAt ?? new Date().toISOString()),
    severity,
  };
}

export function usePlatformTenantsData() {
  const apiMode = isApiDataSource();
  const [remote, setRemote] = useState<PlatformTenant[] | null>(null);
  const [loading, setLoading] = useState(apiMode);

  useEffect(() => {
    if (!apiMode) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    let cancelled = false;
    void fetchPlatformTenants()
      .then((rows) => {
        if (cancelled) return;
        setRemote((rows as Record<string, unknown>[]).map(mapTenant));
      })
      .catch(() => {
        if (!cancelled) setRemote(seedTenants);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  return {
    tenants: remote ?? seedTenants,
    setTenants: setRemote as React.Dispatch<
      React.SetStateAction<PlatformTenant[]>
    >,
    loading,
    apiMode,
  };
}

export function usePlatformSubscriptionsData() {
  const apiMode = isApiDataSource();
  const [remote, setRemote] = useState<PlatformSubscription[] | null>(null);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    void fetchPlatformSubscriptions()
      .then((rows) => {
        if (cancelled) return;
        setRemote((rows as Record<string, unknown>[]).map(mapSubscription));
      })
      .catch(() => {
        if (!cancelled) setRemote(seedSubscriptions);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  return {
    subscriptions: remote ?? seedSubscriptions,
    setSubscriptions: setRemote as React.Dispatch<
      React.SetStateAction<PlatformSubscription[]>
    >,
    apiMode,
  };
}

export function usePlatformActivityData() {
  const apiMode = isApiDataSource();
  const [remote, setRemote] = useState<PlatformActivity[] | null>(null);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    void fetchPlatformActivity()
      .then((rows) => {
        if (cancelled) return;
        setRemote((rows as Record<string, unknown>[]).map(mapActivity));
      })
      .catch(() => {
        if (!cancelled) setRemote(seedActivity);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  return {
    activity: remote ?? seedActivity,
    setActivity: setRemote as React.Dispatch<
      React.SetStateAction<PlatformActivity[]>
    >,
    apiMode,
  };
}

export function usePlatformRevenueData() {
  const apiMode = isApiDataSource();
  const [revenue, setRevenue] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    void fetchPlatformRevenue()
      .then((data) => {
        if (!cancelled) setRevenue(data);
      })
      .catch(() => {
        if (!cancelled) setRevenue(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  return { revenue, apiMode };
}

export function usePlatformSettingsData() {
  const apiMode = isApiDataSource();
  const [settings, setSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    void fetchPlatformSettings()
      .then((data) => {
        if (!cancelled) setSettings(data ?? {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  async function save(next: Record<string, unknown>) {
    setSettings(next);
    if (apiMode) await updatePlatformSettings(next);
  }

  return { settings, save, apiMode };
}
