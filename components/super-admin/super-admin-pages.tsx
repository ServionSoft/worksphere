"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  CreditCard,
  DollarSign,
  Store,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { DEMO_NOW_ISO, demoId } from "@/lib/demo-clock";
import {
  platformActivity,
  platformPlans,
  platformSubscriptions,
  type PlatformActivity,
  type PlatformPlan,
  type PlatformSubscription,
  type PlatformTenant,
} from "@/lib/mock-platform";
import {
  usePlatformActivityData,
  usePlatformSubscriptionsData,
  usePlatformTenantsData,
} from "@/lib/platform-data";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

type TenantStatus = PlatformTenant["status"];
type TenantPlan = PlatformTenant["plan"];
type SubscriptionStatus = PlatformSubscription["status"];

const TENANT_PLANS: TenantPlan[] = ["Starter", "Pro", "Enterprise"];
const SUB_STATUSES: SubscriptionStatus[] = ["active", "past_due", "canceled"];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      {label ? <p className="mb-0.5 font-medium">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted-foreground">
          {entry.name}:{" "}
          <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function statusBadge(status: TenantStatus | string) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    trial: "bg-sky-50 text-sky-700 border-sky-200",
    suspended: "bg-red-50 text-red-700 border-red-200",
    past_due: "bg-amber-50 text-amber-800 border-amber-200",
    canceled: "bg-muted text-muted-foreground",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

function useTenantDirectory() {
  const { tenants: baseTenants, apiMode } = usePlatformTenantsData();
  const [statusOverrides, setStatusOverrides] = useLocalStorage<
    Record<string, TenantStatus>
  >("worksphere.platform.tenant-status", {});
  const [planOverrides, setPlanOverrides] = useLocalStorage<
    Record<string, TenantPlan>
  >("worksphere.platform.tenant-plans", {});

  const tenants = useMemo(
    () =>
      baseTenants.map((t) => ({
        ...t,
        status: statusOverrides[t.id] ?? t.status,
        plan: planOverrides[t.id] ?? t.plan,
      })),
    [baseTenants, statusOverrides, planOverrides]
  );

  function setStatus(id: string, status: TenantStatus) {
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
    toast.success(
      status === "suspended" ? "Tenant suspended" : "Tenant activated",
      {
        description: apiMode
          ? "Override applied locally; tenant list loaded from API."
          : "Demo state saved to localStorage.",
      }
    );
  }

  function setPlan(id: string, plan: TenantPlan) {
    setPlanOverrides((prev) => ({ ...prev, [id]: plan }));
    toast.success("Plan assignment updated", {
      description: apiMode
        ? "Override applied locally; billing plans sync from API."
        : "Demo state saved to localStorage.",
    });
  }

  return { tenants, setStatus, setPlan };
}

function usePlatformSubscriptions() {
  const { subscriptions: apiSubs, apiMode } = usePlatformSubscriptionsData();
  const [localSubs, setLocalSubs] = useLocalStorage<PlatformSubscription[]>(
    "worksphere.platform.subscriptions",
    platformSubscriptions
  );
  const subscriptions = apiMode ? apiSubs : localSubs;

  function setStatus(id: string, status: SubscriptionStatus) {
    if (apiMode) {
      toast.success("Subscription status noted", {
        description: "Source of truth is /api/platform/subscriptions.",
      });
      return;
    }
    setLocalSubs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    toast.success("Subscription status updated", {
      description: "Saved to worksphere.platform.subscriptions",
    });
  }

  return { subscriptions, setStatus };
}

function usePlatformPlans() {
  const [plans, setPlans] = useLocalStorage<PlatformPlan[]>(
    "worksphere.platform.plans",
    platformPlans
  );

  function toggleFeature(planId: string, featureId: string, enabled: boolean) {
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id !== planId
          ? plan
          : {
              ...plan,
              features: plan.features.map((f) =>
                f.id === featureId ? { ...f, enabled } : f
              ),
            }
      )
    );
    toast.message("Plan feature flag updated (demo)");
  }

  return { plans, toggleFeature };
}

function usePlatformActivity() {
  const { activity: apiActivity, apiMode } = usePlatformActivityData();
  const [localActivity, setLocalActivity] = useLocalStorage<PlatformActivity[]>(
    "worksphere.platform.activity",
    platformActivity
  );
  const activity = apiMode ? apiActivity : localActivity;

  function addNote(input: {
    title: string;
    detail: string;
    severity: PlatformActivity["severity"];
  }) {
    const entry: PlatformActivity = {
      id: demoId("pa"),
      title: input.title.trim(),
      detail: input.detail.trim(),
      at: DEMO_NOW_ISO,
      severity: input.severity,
    };
    if (!apiMode) {
      setLocalActivity((prev) => [entry, ...prev]);
    }
    toast.success("Activity note added", {
      description: apiMode
        ? "Local note only — platform activity is loaded from API."
        : "Saved to localStorage.",
    });
  }

  return { activity, addNote };
}

export function SuperAdminOverview() {
  const { tenants } = useTenantDirectory();
  const { subscriptions } = usePlatformSubscriptions();
  const { activity } = usePlatformActivity();
  const { opportunities, developers } = useWorkspaceStore();

  const mrr = tenants
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + t.mrr, 0);
  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;
  const seatsUsed = tenants.reduce((s, t) => s + t.usedSeats, 0);
  const seatsTotal = tenants.reduce((s, t) => s + t.seats, 0);

  const kpis = [
    {
      label: "Platform MRR",
      value: formatCurrency(mrr),
      icon: DollarSign,
      tone: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Active tenants",
      value: String(activeTenants),
      icon: Building2,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Suspended",
      value: String(suspended),
      icon: AlertTriangle,
      tone: "text-red-600 bg-red-50",
    },
    {
      label: "Seats used",
      value: `${seatsUsed}/${seatsTotal}`,
      icon: Users,
      tone: "text-sky-600 bg-sky-50",
    },
    {
      label: "Marketplace open",
      value: String(opportunities.filter((o) => o.status === "open").length),
      icon: Store,
      tone: "text-violet-600 bg-violet-50",
    },
    {
      label: "Subscriptions",
      value: String(subscriptions.length),
      icon: CreditCard,
      tone: "text-amber-600 bg-amber-50",
    },
  ];

  const planMix = useMemo(() => {
    const counts = tenants.reduce<Record<string, number>>((acc, t) => {
      acc[t.plan] = (acc[t.plan] ?? 0) + 1;
      return acc;
    }, {});
    const colors: Record<string, string> = {
      Starter: "#94a3b8",
      Pro: "#4f46e5",
      Enterprise: "#0ea5e9",
    };
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: colors[name] ?? "#64748b",
    }));
  }, [tenants]);

  const recentActivity = activity.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Platform overview"
        description="Multi-tenant KPIs from mock platform fixtures (local demo)."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </p>
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-lg",
                    item.tone
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Plan mix" description="Tenants by plan">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {planMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Recent platform activity" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {recentActivity.map((item) => (
              <li key={item.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      item.severity === "critical" &&
                        "border-red-200 text-red-700",
                      item.severity === "warning" &&
                        "border-amber-200 text-amber-800"
                    )}
                  >
                    {item.severity}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatRelativeTime(item.at)}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Developer pool snapshot" description="From workspace store">
        <p className="text-sm text-muted-foreground">
          {developers.length} developer profiles ·{" "}
          {developers.filter((d) => d.status === "verified").length} verified ·{" "}
          {developers.filter((d) => d.status === "pending_verification").length}{" "}
          pending verification
        </p>
      </SectionCard>
    </div>
  );
}

export function SuperAdminTenants() {
  const { tenants, setStatus, setPlan } = useTenantDirectory();
  const [query, setQuery] = useState("");

  const filtered = tenants.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.ownerEmail.toLowerCase().includes(q) ||
      t.plan.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tenants"
        description="Directory with suspend / activate and plan assignment stored in localStorage."
      />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tenants…"
        className="max-w-sm"
      />
      <SectionCard title="Tenant directory" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.ownerEmail}</p>
                </TableCell>
                <TableCell>
                  <Select
                    value={t.plan}
                    onValueChange={(value) => {
                      if (
                        value === "Starter" ||
                        value === "Pro" ||
                        value === "Enterprise"
                      ) {
                        setPlan(t.id, value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue>{t.plan}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {TENANT_PLANS.map((plan) => (
                          <SelectItem key={plan} value={plan}>
                            {plan}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
                      statusBadge(t.status)
                    )}
                  >
                    {t.status}
                  </span>
                </TableCell>
                <TableCell>
                  {t.usedSeats}/{t.seats}
                </TableCell>
                <TableCell>{formatCurrency(t.mrr)}</TableCell>
                <TableCell className="text-right">
                  {t.status === "suspended" ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setStatus(t.id, "active")}
                    >
                      Activate
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => setStatus(t.id, "suspended")}
                    >
                      Suspend
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

export function SuperAdminSubscriptions() {
  const { subscriptions, setStatus } = usePlatformSubscriptions();
  const { plans, toggleFeature } = usePlatformPlans();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Subscriptions"
        description="Plan renewals from mock platform subscriptions (localStorage)."
      />
      <SectionCard title="Active subscriptions" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Renews</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.tenantName}</TableCell>
                <TableCell>{s.plan}</TableCell>
                <TableCell>
                  <Select
                    value={s.status}
                    onValueChange={(value) => {
                      if (
                        value === "active" ||
                        value === "past_due" ||
                        value === "canceled"
                      ) {
                        setStatus(s.id, value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue>
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
                            statusBadge(s.status)
                          )}
                        >
                          {s.status.replace("_", " ")}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SUB_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{formatDate(s.renewsAt)}</TableCell>
                <TableCell>{formatCurrency(s.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard
        title="Catalog plans"
        description="Toggle feature flags (saved to worksphere.platform.plans)."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-border px-4 py-3"
            >
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatCurrency(plan.price)}
                <span className="text-xs font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.seats} seats
              </p>
              <ul className="mt-3 space-y-2">
                {plan.features.map((f) => (
                  <li key={f.id}>
                    <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "text-foreground",
                          !f.enabled && "text-muted-foreground line-through"
                        )}
                      >
                        {f.label}
                      </span>
                      <Checkbox
                        checked={f.enabled}
                        onCheckedChange={(checked) =>
                          toggleFeature(plan.id, f.id, Boolean(checked))
                        }
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export function SuperAdminMarketplace() {
  const { opportunities, quotations, developers } = useWorkspaceStore();

  const byStatus = useMemo(() => {
    const open = opportunities.filter((o) => o.status === "open").length;
    const filled = opportunities.filter((o) => o.status === "filled").length;
    const closed = opportunities.filter((o) => o.status === "closed").length;
    return [
      { name: "Open", value: open, fill: "#4f46e5" },
      { name: "Filled", value: filled, fill: "#10b981" },
      { name: "Closed", value: closed, fill: "#94a3b8" },
    ];
  }, [opportunities]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Marketplace overview"
        description="Cross-tenant opportunity health from the demo workspace store."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Listings</p>
          <p className="mt-1 text-2xl font-semibold">{opportunities.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Quotations</p>
          <p className="mt-1 text-2xl font-semibold">{quotations.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3.5">
          <p className="text-xs text-muted-foreground">Developers</p>
          <p className="mt-1 text-2xl font-semibold">{developers.length}</p>
        </div>
      </div>
      <SectionCard title="Filled vs open">
        <div className="h-56 max-w-md">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byStatus}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={3}
              >
                {byStatus.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
      <SectionCard title="Recent listings" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Published</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.slice(0, 8).map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.title}</TableCell>
                <TableCell className="capitalize">{o.status}</TableCell>
                <TableCell>
                  {formatCurrency(o.budgetMin)}–{formatCurrency(o.budgetMax)}
                </TableCell>
                <TableCell>{formatDate(o.publishedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

export function SuperAdminRevenue() {
  const { tenants } = useTenantDirectory();
  const chartData = tenants.map((t) => ({
    name: t.name.length > 12 ? `${t.name.slice(0, 10)}…` : t.name,
    mrr: t.mrr,
  }));
  const total = tenants.reduce((s, t) => s + t.mrr, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Revenue"
        description={`Platform MRR ${formatCurrency(total)} from tenant fixtures.`}
      />
      <SectionCard title="MRR by tenant">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={22}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="mrr" name="MRR" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}

export function SuperAdminActivity() {
  const { activity, addNote } = usePlatformActivity();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [severity, setSeverity] =
    useState<PlatformActivity["severity"]>("info");

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    addNote({
      title,
      detail: detail || "Manual note",
      severity,
    });
    setTitle("");
    setDetail("");
    setSeverity("info");
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Activity & security"
        description="Platform monitoring feed from mock fixtures plus manual notes."
      />
      <SectionCard title="Add activity note">
        <form className="flex flex-col gap-3" onSubmit={handleAddNote}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
          />
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Optional detail"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={severity}
              onValueChange={(value) => {
                if (
                  value === "info" ||
                  value === "warning" ||
                  value === "critical"
                ) {
                  setSeverity(value);
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue className="capitalize">{severity}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm">
              Add note
            </Button>
          </div>
        </form>
      </SectionCard>
      <SectionCard title="Security & ops feed" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {activity.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(item.at)} · {formatRelativeTime(item.at)}
                </p>
              </div>
              <Badge variant="outline" className="capitalize w-fit">
                {item.severity}
              </Badge>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Monitoring notes">
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          <li>Failed login spikes and SSO anomalies would appear here in production.</li>
          <li>Manual notes and seed activity are stored in localStorage for this demo.</li>
          <li>Tenant suspend/activate changes are local and not audited remotely.</li>
        </ul>
      </SectionCard>
    </div>
  );
}

export function SuperAdminSettings() {
  const [settings, setSettings] = useLocalStorage(
    "worksphere.platform.settings",
    {
      allowSelfServe: true,
      requireDeveloperVerification: true,
      maintenanceMode: false,
      marketplacePublic: true,
    }
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Platform settings"
        description="Global toggles for the mock SaaS control plane."
      />
      <SectionCard title="Feature flags (local)">
        <ul className="flex flex-col gap-3">
          {(
            [
              ["allowSelfServe", "Allow self-serve signup"],
              ["requireDeveloperVerification", "Require developer verification"],
              ["maintenanceMode", "Maintenance mode"],
              ["marketplacePublic", "Public marketplace browse"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm"
            >
              <span>{label}</span>
              <Checkbox
                checked={settings[key]}
                onCheckedChange={(checked) => {
                  setSettings((prev) => ({
                    ...prev,
                    [key]: Boolean(checked),
                  }));
                  toast.message("Platform setting updated (demo)");
                }}
              />
            </label>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
