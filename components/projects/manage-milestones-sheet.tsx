"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProjectMilestones } from "@/components/projects/detail/project-milestones";
import type { Project } from "@/lib/types";

interface ManageMilestonesSheetProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageMilestonesSheet({
  project,
  open,
  onOpenChange,
}: ManageMilestonesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-4xl"
      >
        <SheetHeader className="border-b border-border px-4 py-4 sm:px-6">
          <SheetTitle>
            {project ? `Milestones · ${project.name}` : "Milestones"}
          </SheetTitle>
          <SheetDescription>
            Create, price, approve, reorder, and publish milestones without
            leaving the projects list.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-4 sm:px-6">
          {project ? <ProjectMilestones projectId={project.id} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
