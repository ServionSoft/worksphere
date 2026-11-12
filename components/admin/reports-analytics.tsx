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
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
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
import { projectsByStatus, taskCompletion } from "@/lib/mock-data";
import { DEMO_NOW } from "@/lib/demo-clock";
import { formatCurrency } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";

const DATE_RANGES = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function rangeBounds(rangeId: string): { start: Date; end: Date } {
  const end = DEMO_NOW;
  if (rangeId === "7d") {
    return { start: new Date(end.getTime() - 7 * MS_PER_DAY), end };
  }
  if (rangeId === "30d") {
    return { start: new Date(end.getTime() - 30 * MS_PER_DAY), end };
  }
  if (rangeId === "90d") {
    return { start: new Date(end.getTime() - 90 * MS_PER_DAY), end };
  }
  return {
    start: new Date(Date.UTC(end.getUTCFullYear(), 0, 1)),
    end,
  };
}

function dateInRange(iso: string | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= start && d <= end;
}

function overlapsRange(
  startIso: string | undefined,
  endIso: string | undefined,
  start: Date,
  end: Date
): boolean {
  return dateInRange(startIso, start, end) || dateInRange(endIso, start, end);
}

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

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsAnalytics() {
  const { projects, tasks, developers, opportunities, activity } =
    useWorkspaceStore();
  const [range, setRange] = useState<string>("30d");
  const [projectId, setProjectId] = useState<string>("all");

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => rangeBounds(range),
    [range]
  );

  const filteredProjects = useMemo(() => {
    const base = projects.filter(
      (p) =>
        !p.archived &&
        overlapsRange(p.startDate, p.dueDate, rangeStart, rangeEnd)
    );
    if (projectId === "all") return base;
    return base.filter((p) => p.id === projectId);
  }, [projects, projectId, rangeStart, rangeEnd]);

  const filteredTasks = useMemo(() => {
    const base = tasks.filter((t) =>
      overlapsRange(t.startDate, t.dueDate, rangeStart, rangeEnd)
    );
    if (projectId === "all") return base;
    return base.filter((t) => t.projectId === projectId);
  }, [tasks, projectId, rangeStart, rangeEnd]);

  const filteredActivity = useMemo(() => {
    const base = activity.filter((a) =>
      dateInRange(a.timestamp, rangeStart, rangeEnd)
    );
    if (projectId === "all") return base;
    return base.filter((a) => a.projectId === projectId);
  }, [activity, projectId, rangeStart, rangeEnd]);

  const statusData = projectsByStatus(filteredProjects);
  const completionData = taskCompletion(filteredTasks);

  const budgetData = useMemo(
    () =>
      filteredProjects.map((p) => ({
        name: p.name.length > 14 ? `${p.name.slice(0, 12)}…` : p.name,
        budget: Math.round(p.budget / 1000),
        spent: Math.round(p.spent / 1000),
        utilization: p.budget
          ? Math.round((p.spent / p.budget) * 100)
          : 0,
      })),
    [filteredProjects]
  );

  const overdueData = useMemo(() => {
    const overdue = filteredTasks.filter(
      (t) => t.status !== "done" && new Date(t.dueDate) < DEMO_NOW
    );
    const byProject = overdue.reduce<Record<string, number>>((acc, t) => {
      acc[t.projectName] = (acc[t.projectName] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(byProject).map(([name, count]) => ({
      name: name.length > 14 ? `${name.slice(0, 12)}…` : name,
      overdue: count,
    }));
  }, [filteredTasks]);

  const marketplaceData = useMemo(() => {
    const inRange = opportunities.filter((o) =>
      dateInRange(o.publishedAt, rangeStart, rangeEnd)
    );
    const filled = inRange.filter((o) => o.status === "filled").length;
    const open = inRange.filter((o) => o.status === "open").length;
    const closed = inRange.filter((o) => o.status === "closed").length;
    return [
      { name: "Filled", value: filled, fill: "#10b981" },
      { name: "Open", value: open, fill: "#4f46e5" },
      { name: "Closed", value: closed, fill: "#94a3b8" },
    ];
  }, [opportunities, rangeStart, rangeEnd]);

  const profitability = useMemo(
    () =>
      filteredProjects.map((p) => ({
        id: p.id,
        name: p.name,
        budget: p.budget,
        spent: p.spent,
        remaining: p.budget - p.spent,
        marginPct: p.budget
          ? Math.round(((p.budget - p.spent) / p.budget) * 100)
          : 0,
      })),
    [filteredProjects]
  );

  function exportReport(format: "json" | "csv") {
    const payload = {
      generatedAt: "2026-03-11T12:00:00Z",
      range,
      projectId,
      activityCount: filteredActivity.length,
      statusData,
      completionData,
      budgetData,
      overdueData,
      marketplaceData,
      developers: developers.map((d) => ({
        name: d.name,
        rating: d.rating,
        completed: d.completedAssignments,
        onTimePercent: d.onTimePercent,
        earnings: d.totalEarnings,
      })),
      profitability,
    };

    if (format === "json") {
      downloadBlob(
        `worksphere-report-${range}.json`,
        JSON.stringify(payload, null, 2),
        "application/json"
      );
    } else {
      const rows = [
        "section,name,value",
        ...statusData.map((r) => `status,${r.name},${r.value}`),
        ...profitability.map(
          (r) => `profitability,${r.name},${r.marginPct}`
        ),
      ];
      downloadBlob(
        `worksphere-report-${range}.csv`,
        rows.join("\n"),
        "text/csv"
      );
    }

    toast.success(`Export ready (${format.toUpperCase()})`, {
      description: "Simulated download from local demo data — not a server export.",
    });
  }

  const rangeLabel =
    DATE_RANGES.find((r) => r.id === range)?.label ?? "Selected range";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports & Analytics"
        description={`Delivery health, utilization and portfolio reporting · ${rangeLabel} · ${filteredProjects.length} projects · ${filteredTasks.length} tasks · ${filteredActivity.length} activity events.`}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportReport("csv")}
            >
              <Download data-icon="inline-start" />
              CSV
            </Button>
            <Button size="sm" onClick={() => exportReport("json")}>
              <Download data-icon="inline-start" />
              Export JSON
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Select value={range} onValueChange={(v) => setRange(v ?? "30d")}>
          <SelectTrigger className="min-w-40">
            <SelectValue>
              {DATE_RANGES.find((r) => r.id === range)?.label ?? "Range"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={projectId}
          onValueChange={(v) => setProjectId(v ?? "all")}
        >
          <SelectTrigger className="min-w-48">
            <SelectValue>
              {projectId === "all"
                ? "All projects"
                : projects.find((p) => p.id === projectId)?.name ?? "Project"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All projects</SelectItem>
              {projects
                .filter((p) => !p.archived)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Project status" description="Portfolio distribution">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Task completion" description="Done vs in flight">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={78}
                >
                  {completionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Budget utilization"
          description="Budget vs spent ($K)"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} barSize={14}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="budget" name="Budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="Spent" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Overdue tasks" description="Count by project">
          <div className="h-56">
            {overdueData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No overdue tasks in this filter.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overdueData} barSize={18}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="overdue"
                    name="Overdue"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Marketplace"
          description="Filled vs open listings"
          className="xl:col-span-2"
        >
          <div className="h-56 max-w-md">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketplaceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {marketplaceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-3">
            {marketplaceData.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                {item.name} ({item.value})
              </span>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Developer performance"
          description="From marketplace developer profiles"
          bodyClassName="p-0"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Developer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>On-time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {developers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.rating.toFixed(1)}</TableCell>
                  <TableCell>{d.completedAssignments}</TableCell>
                  <TableCell>{d.onTimePercent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          title="Profitability"
          description="Budget − spent by project"
          bodyClassName="p-0"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitability.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{formatCurrency(row.budget)}</TableCell>
                  <TableCell>{formatCurrency(row.spent)}</TableCell>
                  <TableCell
                    className={
                      row.marginPct < 15
                        ? "text-amber-700"
                        : "text-emerald-700"
                    }
                  >
                    {row.marginPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </div>
  );
}
