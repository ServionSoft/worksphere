"use client";

import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getDeadlineState, type DeadlineTone } from "@/lib/deadline";
import { formatDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneClass: Record<DeadlineTone, string> = {
  none: "border-border bg-muted/40 text-muted-foreground",
  on_track: "border-emerald-200 bg-emerald-50 text-emerald-900",
  due_soon: "border-amber-300 bg-amber-50 text-amber-950",
  overdue: "border-red-300 bg-red-50 text-red-900",
  completed: "border-border bg-muted text-muted-foreground",
};

export function DeadlineBadge({
  deadline,
  completed,
  className,
  showIcon = true,
}: {
  deadline?: string | null;
  completed?: boolean;
  className?: string;
  showIcon?: boolean;
}) {
  const state = getDeadlineState(deadline, { completed });
  if (state.tone === "none") return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium capitalize",
        toneClass[state.tone],
        className
      )}
    >
      {showIcon ? <CalendarClock className="size-3" /> : null}
      {state.label}
    </Badge>
  );
}

/** Highlighted deadline line for headers and cards. */
export function DeadlineMeta({
  deadline,
  originalDeadline,
  completed,
  compact,
  className,
}: {
  deadline?: string | null;
  originalDeadline?: string | null;
  completed?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const state = getDeadlineState(deadline, { completed });
  if (!deadline) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        No deadline set
      </span>
    );
  }

  const dateLabel = compact
    ? formatShortDate(deadline)
    : formatDate(deadline);
  const showOriginal =
    originalDeadline &&
    originalDeadline.slice(0, 10) !== String(deadline).slice(0, 10);

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-2 text-xs",
        className
      )}
    >
      <span
        className={cn(
          "font-semibold tabular-nums",
          state.tone === "overdue" && "text-red-700",
          state.tone === "due_soon" && "text-amber-800",
          state.tone === "on_track" && "text-foreground",
          state.tone === "completed" && "text-muted-foreground"
        )}
      >
        Deadline {dateLabel}
      </span>
      <DeadlineBadge deadline={deadline} completed={completed} />
      {showOriginal ? (
        <span className="text-muted-foreground">
          (was {compact ? formatShortDate(originalDeadline!) : formatDate(originalDeadline!)})
        </span>
      ) : null}
    </span>
  );
}
