"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import {
  ProjectCard,
  resolveProjectCardActions,
} from "@/components/projects/project-card";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import {
  DeleteProjectDialog,
  canDeleteProjects,
} from "@/components/projects/delete-project-dialog";
import { AddMilestoneDialog } from "@/components/projects/add-milestone-dialog";
import { ManageMilestonesSheet } from "@/components/projects/manage-milestones-sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusFilters: Array<{ label: string; value: "all" | ProjectStatus }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Planning", value: "planning" },
  { label: "At Risk", value: "at_risk" },
  { label: "On Hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
];

function canManageProjects(role: string | undefined) {
  return (
    role === "tenant_admin" ||
    role === "project_manager" ||
    role === "super_admin"
  );
}

export function ProjectsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";
  const { user } = useRequiredAuth();
  const {
    projects,
    milestones,
    searchQuery: globalQuery,
    archiveProject,
  } = useWorkspaceStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [milestoneProject, setMilestoneProject] = useState<Project | null>(
    null
  );
  const [manageProject, setManageProject] = useState<Project | null>(null);
  const allowDelete = canDeleteProjects(user.role);
  const allowManage = canManageProjects(user.role);
  const [view, setView] = useLocalStorage<"grid" | "table">(
    "worksphere.projects.view",
    "grid"
  );
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [query, setQuery] = useState(initialQuery || globalQuery);

  const milestoneCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of milestones) {
      map.set(m.projectId, (map.get(m.projectId) ?? 0) + 1);
    }
    return map;
  }, [milestones]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (project.archived) return false;
      const matchesStatus = status === "all" || project.status === status;
      const matchesQuery =
        !q ||
        project.name.toLowerCase().includes(q) ||
        project.clientName.toLowerCase().includes(q) ||
        project.managerName.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [projects, query, status]);

  function handleArchive(id: string, name: string) {
    archiveProject(id);
    toast.success("Project archived", {
      description: `${name} moved to archive (demo).`,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Projects"
        description="Manage delivery across clients, owners and timelines."
        actions={
          allowManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Create project
            </Button>
          ) : null
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
                  status === filter.value &&
                    "bg-primary/10 text-primary hover:bg-primary/15"
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
        Showing {filtered.length} of{" "}
        {projects.filter((p) => !p.archived).length} projects
      </p>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              milestoneCount={milestoneCounts.get(project.id) ?? 0}
              canManage={allowManage}
              canDelete={allowDelete}
              onAddMilestone={setMilestoneProject}
              onManageMilestones={setManageProject}
              onEdit={allowManage ? setEditingProject : undefined}
              onArchive={
                allowManage
                  ? (p) => handleArchive(p.id, p.name)
                  : undefined
              }
              onDelete={allowDelete ? setDeletingProject : undefined}
            />
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
                  <TableHead>Milestones</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((project) => {
                  const count = milestoneCounts.get(project.id) ?? 0;
                  const cardActions = resolveProjectCardActions(
                    project,
                    count
                  );
                  return (
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
                          <Progress
                            value={project.progress}
                            className="min-w-24 flex-1"
                          />
                          <span className="w-8 text-right text-xs tabular-nums">
                            {project.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={project.priority} />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {count}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatShortDate(project.dueDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {allowManage && cardActions.showAddMilestone ? (
                            <Button
                              size="sm"
                              onClick={() => setMilestoneProject(project)}
                              title="Add milestone"
                            >
                              <Plus data-icon="inline-start" />
                              Add
                            </Button>
                          ) : null}
                          {allowManage && cardActions.showManage ? (
                            <Button
                              size="icon-sm"
                              variant="outline"
                              title={cardActions.manageLabel}
                              onClick={() => setManageProject(project)}
                            >
                              <Settings2 className="size-3.5" />
                              <span className="sr-only">
                                {cardActions.manageLabel}
                              </span>
                            </Button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button size="icon-sm" variant="outline" />
                              }
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Project actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/projects/${project.id}`)
                                }
                              >
                                Open Project
                              </DropdownMenuItem>
                              {allowManage && cardActions.showAddMilestone ? (
                                <DropdownMenuItem
                                  onClick={() => setMilestoneProject(project)}
                                >
                                  <Plus className="size-3.5" />
                                  Add Milestone
                                </DropdownMenuItem>
                              ) : null}
                              {allowManage ? (
                                <DropdownMenuItem
                                  onClick={() => setManageProject(project)}
                                >
                                  <Settings2 className="size-3.5" />
                                  Manage Milestones
                                </DropdownMenuItem>
                              ) : null}
                              {allowManage ? (
                                <DropdownMenuItem
                                  onClick={() => setEditingProject(project)}
                                >
                                  <Pencil className="size-3.5" />
                                  Edit Project
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/projects/${project.id}?tab=activity`
                                  )
                                }
                              >
                                View Activity
                              </DropdownMenuItem>
                              {allowManage ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleArchive(project.id, project.name)
                                  }
                                >
                                  <Archive className="size-3.5" />
                                  Archive Project
                                </DropdownMenuItem>
                              ) : null}
                              {allowDelete ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                      setDeletingProject(project)
                                    }
                                  >
                                    <Trash2 className="size-3.5" />
                                    Delete Project
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
          {allowManage ? (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Create project
            </Button>
          ) : null}
        </div>
      ) : null}

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditProjectDialog
        project={editingProject}
        open={Boolean(editingProject)}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null);
        }}
      />
      <DeleteProjectDialog
        project={deletingProject}
        open={Boolean(deletingProject)}
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null);
        }}
      />
      <AddMilestoneDialog
        project={milestoneProject}
        open={Boolean(milestoneProject)}
        onOpenChange={(open) => {
          if (!open) setMilestoneProject(null);
        }}
      />
      <ManageMilestonesSheet
        project={manageProject}
        open={Boolean(manageProject)}
        onOpenChange={(open) => {
          if (!open) setManageProject(null);
        }}
      />
    </div>
  );
}
