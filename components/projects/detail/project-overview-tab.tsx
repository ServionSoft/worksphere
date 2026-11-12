"use client";

import { CalendarDays, CircleDollarSign, UserRound, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/shared/section-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { MilestoneStatusBadge } from "@/components/shared/milestone-badge";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
} from "@/lib/format";
import type { Milestone, Project, Task } from "@/lib/types";

interface ProjectOverviewTabProps {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
}

export function ProjectOverviewTab({
  project,
  tasks,
  milestones,
}: ProjectOverviewTabProps) {
  const parents = tasks.filter((t) => !t.parentId);
  const done = parents.filter((t) => t.status === "done").length;
  const budgetPct = Math.min(
    100,
    Math.round((project.spent / Math.max(project.budget, 1)) * 100)
  );

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <SectionCard
        title="Project information"
        description="Core delivery context"
        className="xl:col-span-2"
      >
        <p className="text-sm leading-6 text-muted-foreground">
          {project.description}
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <InfoRow
            icon={Building2}
            label="Client"
            value={project.clientName}
          />
          <InfoRow
            icon={UserRound}
            label="Project manager"
            value={project.managerName}
          />
          <InfoRow
            icon={CalendarDays}
            label="Start date"
            value={formatDate(project.startDate)}
          />
          <InfoRow
            icon={CalendarDays}
            label="Due date"
            value={formatDate(project.dueDate)}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Status</span>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Priority</span>
            <div>
              <PriorityBadge priority={project.priority} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Budget & progress" description="Spend vs plan">
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Delivery progress</span>
              <span className="font-medium tabular-nums">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Budget used</span>
              <span className="font-medium tabular-nums">{budgetPct}%</span>
            </div>
            <Progress value={budgetPct} />
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CircleDollarSign className="size-3.5" />
              Budget
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCurrency(project.spent, project.currency)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {formatCurrency(project.budget, project.currency)}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <Stat label="Tasks done" value={`${done}/${parents.length}`} />
            <Stat label="Milestones" value={String(milestones.length)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Upcoming milestones"
        description="Key delivery checkpoints"
        className="xl:col-span-3"
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {milestones.slice(0, 4).map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  Due {formatShortDate(m.dueDate)} · {m.deliverables.length}{" "}
                  deliverables
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden w-28 sm:block">
                  <Progress value={m.progress} />
                </div>
                <MilestoneStatusBadge status={m.status} />
              </div>
            </li>
          ))}
          {milestones.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              No milestones yet.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
