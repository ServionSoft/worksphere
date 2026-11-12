"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusFilters: Array<{ label: string; value: "all" | ProjectStatus }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Planning", value: "planning" },
  { label: "At Risk", value: "at_risk" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
];

export function ProjectsView() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const { projects, searchQuery: globalQuery } = useWorkspaceStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useLocalStorage<"grid" | "table">(
    "worksphere.projects.view",
    "grid"
  );
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [query, setQuery] = useState(initialQuery || globalQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = status === "all" || project.status === status;
      const matchesQuery =
        !q ||
        project.name.toLowerCase().includes(q) ||
        project.clientName.toLowerCase().includes(q) ||
        project.managerName.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [projects, query, status]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Projects"
        description="Manage delivery across clients, owners and timelines."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Create project
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                size="sm"
                variant={status === filter.value ? "secondary" : "ghost"}
                onClick={() => setStatus(filter.value)}
                className={cn(
                  status === filter.value && "bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <Tabs
            value={view}
            onValueChange={(value) => {
              if (value === "grid" || value === "table") setView(value);
            }}
          >
            <TabsList>
              <TabsTrigger value="grid" className="gap-1.5">
                <LayoutGrid className="size-3.5" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5">
                <List className="size-3.5" />
                Table
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {projects.length} projects
      </p>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-40">Progress</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {project.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{project.clientName}</TableCell>
                    <TableCell>{project.managerName}</TableCell>
                    <TableCell>
                      <ProjectStatusBadge status={project.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress} className="min-w-24 flex-1" />
                        <span className="w-8 text-right text-xs tabular-nums">
                          {project.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={project.priority} />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatShortDate(project.dueDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No projects found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another filter or create a new project.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Create project
          </Button>
        </div>
      ) : null}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
