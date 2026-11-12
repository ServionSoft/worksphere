"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatShortDate } from "@/lib/format";
import { clientProjects, productionStage } from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ProjectStatus } from "@/lib/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

export function ClientProjectsPage() {
  const { user } = useRequiredAuth();
  const { projects } = useWorkspaceStore();
  const mine = clientProjects(projects, user);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [view, setView] = useLocalStorage<"grid" | "table">(
    "worksphere.client.projects.view",
    "grid"
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mine
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.managerName.toLowerCase().includes(q)
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [mine, query, status]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Projects"
        description="Projects assigned to your organization."
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
          <Tabs
            value={view}
            onValueChange={(v) => {
              if (v === "grid" || v === "table") setView(v);
            }}
          >
            <TabsList>
              <TabsTrigger value="grid">
                <LayoutGrid className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger value="table">
                <List className="size-3.5" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
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
              <p className="mt-3 text-[11px] text-muted-foreground">
                Due {formatShortDate(project.dueDate)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/client/projects/${project.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>{project.managerName}</TableCell>
                  <TableCell>{productionStage(project.progress)}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{project.progress}%</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatShortDate(project.dueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
