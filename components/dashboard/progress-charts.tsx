"use client";

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
import { SectionCard } from "@/components/shared/section-card";
import {
  projectsByStatus,
  taskCompletion,
  workloadDistribution,
} from "@/lib/mock-data";
import { useWorkspaceStore } from "@/lib/workspace-store";

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
          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function ProgressCharts() {
  const { projects, tasks } = useWorkspaceStore();
  const statusData = projectsByStatus(projects);
  const completionData = taskCompletion(tasks);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <SectionCard title="Projects by status" description="Portfolio distribution">
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
        <div className="mt-1 flex flex-wrap gap-2">
          {statusData.map((item) => (
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

      <SectionCard title="Task completion" description="Your current workload">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={completionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
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
        <div className="mt-1 flex flex-wrap gap-2">
          {completionData.map((item) => (
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

      <SectionCard title="Workload distribution" description="Open tasks by teammate">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workloadDistribution} barSize={18}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="tasks" name="Tasks" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
