"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function ProjectsOverviewTable() {
  const { projects, searchQuery } = useWorkspaceStore();
  const query = searchQuery.trim().toLowerCase();
  const rows = projects
    .filter((project) => {
      if (!query) return true;
      return (
        project.name.toLowerCase().includes(query) ||
        project.clientName.toLowerCase().includes(query) ||
        project.managerName.toLowerCase().includes(query)
      );
    })
    .slice(0, 6);

  return (
    <SectionCard
      title="Project overview"
      description="Track status, ownership and delivery dates"
      action={
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/projects" />}
        >
          View all
        </Button>
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-36">Progress</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Deadline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((project) => (
              <TableRow key={project.id} className="cursor-pointer">
                <TableCell className="font-medium text-foreground">
                  <Link
                    href={`/projects/${project.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>{project.clientName}</TableCell>
                <TableCell>{project.managerName}</TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="min-w-20 flex-1" />
                    <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                      {project.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={project.priority} />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatShortDate(project.startDate)}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatShortDate(project.dueDate)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No projects match your search.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
