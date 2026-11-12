"use client";

import { Flag, Milestone, ClipboardCheck } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { deadlines } from "@/lib/mock-data";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const typeMeta = {
  milestone: {
    label: "Milestone",
    icon: Milestone,
    tone: "bg-indigo-50 text-indigo-600",
  },
  deadline: {
    label: "Deadline",
    icon: Flag,
    tone: "bg-amber-50 text-amber-700",
  },
  review: {
    label: "Review",
    icon: ClipboardCheck,
    tone: "bg-sky-50 text-sky-700",
  },
} as const;

export function UpcomingDeadlines() {
  return (
    <SectionCard
      title="Upcoming deadlines"
      description="Milestones and delivery dates"
      bodyClassName="p-0"
    >
      <ol className="relative space-y-0 px-5 py-2">
        {deadlines.map((item, index) => {
          const meta = typeMeta[item.type];
          const Icon = meta.icon;
          return (
            <li key={item.id} className="relative flex gap-3 py-3">
              {index < deadlines.length - 1 ? (
                <span className="absolute top-10 bottom-0 left-[15px] w-px bg-border" />
              ) : null}
              <span
                className={cn(
                  "relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                  meta.tone
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.projectName} · {meta.label}
                </p>
                <p className="mt-1 text-xs font-medium tabular-nums text-foreground/80">
                  {formatShortDate(item.date)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
