import { DEMO_NOW } from "@/lib/demo-clock";

export type DeadlineTone = "none" | "on_track" | "due_soon" | "overdue" | "completed";

export type DeadlineState = {
  tone: DeadlineTone;
  label: string;
  daysUntil: number | null;
  isOverdue: boolean;
  isDueSoon: boolean;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parse YYYY-MM-DD or ISO into local calendar day. */
export function parseDeadlineDay(value: string | null | undefined): Date | null {
  if (!value || !String(value).trim()) return null;
  const raw = String(value).trim();
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
}

export function getDeadlineState(
  deadline: string | null | undefined,
  options?: {
    /** Work already finished — show completed instead of overdue */
    completed?: boolean;
    /** Days before due that count as "due soon" */
    soonDays?: number;
    now?: Date;
  }
): DeadlineState {
  const soonDays = options?.soonDays ?? 3;
  const now = startOfLocalDay(options?.now ?? DEMO_NOW);
  const due = parseDeadlineDay(deadline);

  if (!due) {
    return {
      tone: "none",
      label: "No deadline",
      daysUntil: null,
      isOverdue: false,
      isDueSoon: false,
    };
  }

  if (options?.completed) {
    return {
      tone: "completed",
      label: "Completed",
      daysUntil: Math.round((due.getTime() - now.getTime()) / 86400000),
      isOverdue: false,
      isDueSoon: false,
    };
  }

  const daysUntil = Math.round((due.getTime() - now.getTime()) / 86400000);

  if (daysUntil < 0) {
    const days = Math.abs(daysUntil);
    return {
      tone: "overdue",
      label: days === 1 ? "1 day overdue" : `${days} days overdue`,
      daysUntil,
      isOverdue: true,
      isDueSoon: false,
    };
  }

  if (daysUntil === 0) {
    return {
      tone: "due_soon",
      label: "Due today",
      daysUntil: 0,
      isOverdue: false,
      isDueSoon: true,
    };
  }

  if (daysUntil <= soonDays) {
    return {
      tone: "due_soon",
      label: daysUntil === 1 ? "Due tomorrow" : `Due in ${daysUntil} days`,
      daysUntil,
      isOverdue: false,
      isDueSoon: true,
    };
  }

  return {
    tone: "on_track",
    label: `Due in ${daysUntil} days`,
    daysUntil,
    isOverdue: false,
    isDueSoon: false,
  };
}
