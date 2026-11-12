"use client";

import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/components/shared/section-card";
import {
  MilestoneStatusBadge,
  milestoneLabels,
} from "@/components/shared/milestone-badge";
import { formatDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Milestone, MilestoneStatus } from "@/lib/types";
import { toast } from "sonner";

const statuses: MilestoneStatus[] = [
  "upcoming",
  "in_progress",
  "completed",
  "missed",
];

interface ProjectMilestonesProps {
  projectId: string;
}

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const { milestones, updateMilestoneStatus } = useWorkspaceStore();
  const items = milestones.filter((m) => m.projectId === projectId);

  return (
    <div className="grid gap-3">
      {items.map((milestone) => (
        <MilestoneCard
          key={milestone.id}
          milestone={milestone}
          onStatusChange={(status) => {
            updateMilestoneStatus(milestone.id, status);
            toast.success("Milestone updated", {
              description: `${milestone.title} → ${milestoneLabels[status]}`,
            });
          }}
        />
      ))}
      {items.length === 0 ? (
        <SectionCard title="Milestones" description="No milestones for this project">
          <p className="text-sm text-muted-foreground">
            Milestones will appear here once planned.
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}

function MilestoneCard({
  milestone,
  onStatusChange,
}: {
  milestone: Milestone;
  onStatusChange: (status: MilestoneStatus) => void;
}) {
  return (
    <SectionCard
      title={milestone.title}
      description={`Due ${formatDate(milestone.dueDate)}`}
      action={<MilestoneStatusBadge status={milestone.status} />}
    >
      <p className="text-sm text-muted-foreground">{milestone.description}</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium tabular-nums">{milestone.progress}%</span>
        </div>
        <Progress value={milestone.progress} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-foreground">Deliverables</p>
        <ul className="flex flex-col gap-1.5">
          {milestone.deliverables.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Update status</span>
        <Select
          value={milestone.status}
          onValueChange={(v) => v && onStatusChange(v as MilestoneStatus)}
        >
          <SelectTrigger size="sm" className="min-w-32">
            <SelectValue>
              {(v) =>
                v ? milestoneLabels[v as MilestoneStatus] : "Status"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {milestoneLabels[s]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </SectionCard>
  );
}
