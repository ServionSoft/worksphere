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
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <SheetTitle>
            {project ? `Milestones · ${project.name}` : "Milestones"}
          </SheetTitle>
          <SheetDescription>
            Create, price, approve, reorder, and publish milestones without
            leaving the projects list.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {project ? (
            <ProjectMilestones projectId={project.id} layout="sheet" />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
