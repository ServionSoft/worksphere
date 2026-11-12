"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatShortDate } from "@/lib/format";
import {
  developerAssignments,
  developerProjects,
  productionStage,
} from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DeveloperProjectsPage() {
  const { user } = useRequiredAuth();
  const { projects, assignments, milestones, tasks } = useWorkspaceStore();
  const mine = developerProjects(projects, assignments, user);
  const myAssignments = developerAssignments(assignments, user);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.managerName.toLowerCase().includes(q)
      );
  }, [mine, query, status]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Projects"
        description="Projects linked to your assignments — timeline, milestones and tasks."
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "planning", "at_risk", "completed"] as const).map(
            (value) => (
              <Button
                key={value}
                size="sm"
                variant={status === value ? "secondary" : "ghost"}
                className={cn(
                  status === value && "bg-primary/10 text-primary hover:bg-primary/15"
                )}
                onClick={() => setStatus(value)}
              >
                {value === "all" ? "All" : value.replace("_", " ")}
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => {
          const linked = myAssignments.filter((a) => a.projectId === project.id);
          const projectMilestones = milestones.filter(
            (m) => m.projectId === project.id
          );
          const myTasks = tasks.filter(
            (t) =>
              t.projectId === project.id &&
              !t.parentId &&
              t.assigneeId === user.developerId
          );
          const nextMilestone = projectMilestones
            .filter((m) => m.status !== "completed")
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

          return (
            <Link
              key={project.id}
              href={`/developer/projects/${project.id}`}
              className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{project.name}</h3>
                <ProjectStatusBadge status={project.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                PM {project.managerName} · {productionStage(project.progress)}
              </p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="tabular-nums">{project.progress}%</span>
                </div>
                <Progress value={project.progress} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Meta label="Assignments" value={String(linked.length)} />
                <Meta label="My tasks" value={String(myTasks.length)} />
                <Meta
                  label="Due"
                  value={formatShortDate(project.dueDate)}
                />
              </div>
              {nextMilestone ? (
                <p className="mt-3 truncate text-[11px] text-muted-foreground">
                  Next milestone · {nextMilestone.title} ·{" "}
                  {formatShortDate(nextMilestone.dueDate)}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          No projects yet. Accept a marketplace opportunity tied to a project to
          unlock timeline and milestones.
        </div>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}
