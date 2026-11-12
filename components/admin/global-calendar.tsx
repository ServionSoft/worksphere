"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_NOW } from "@/lib/demo-clock";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "month" | "week" | "day";

type CalendarItem = {
  id: string;
  title: string;
  date: string;
  projectId: string;
  projectName: string;
  kind: "task" | "milestone";
  overdue: boolean;
};

type CursorDate = { year: number; month: number; day: number };

function toDateKey(value: string): string {
  return value.slice(0, 10);
}

function cursorToKey(cursor: CursorDate): string {
  const m = String(cursor.month + 1).padStart(2, "0");
  const d = String(cursor.day).padStart(2, "0");
  return `${cursor.year}-${m}-${d}`;
}

function keyToCursor(key: string): CursorDate {
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function isOverdue(date: string): boolean {
  return toDateKey(date) < toDateKey(DEMO_NOW.toISOString());
}

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function weekLabel(days: Date[]): string {
  if (days.length === 0) return "";
  const start = days[0];
  const end = days[days.length - 1];
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${startStr} – ${endStr}`;
}

function dayLabel(cursor: CursorDate): string {
  return new Date(
    Date.UTC(cursor.year, cursor.month, cursor.day)
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildMonthGrid(year: number, month: number): Array<Date | null> {
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(Date.UTC(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function buildWeekDays(cursor: CursorDate): Date[] {
  const base = new Date(Date.UTC(cursor.year, cursor.month, cursor.day));
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() - base.getUTCDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}

function shiftCursor(cursor: CursorDate, days: number): CursorDate {
  const next = new Date(Date.UTC(cursor.year, cursor.month, cursor.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth(),
    day: next.getUTCDate(),
  };
}

function DayItemList({ items }: { items: CalendarItem[] }) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        Nothing scheduled for this day.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 px-4 py-3">
          <span
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
              item.kind === "milestone"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {item.kind === "milestone" ? (
              <Flag className="size-3.5" />
            ) : (
              <ListTodo className="size-3.5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {item.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {item.projectName} ·{" "}
              {item.kind === "milestone" ? "Milestone" : "Task"}
            </p>
            {item.overdue ? (
              <p className="mt-1 text-[11px] font-medium text-red-600">
                Overdue
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DayCellContent({
  dayItems,
  max = 3,
}: {
  dayItems: CalendarItem[];
  max?: number;
}) {
  return (
    <div className="mt-1 flex min-w-0 flex-col gap-0.5">
      {dayItems.slice(0, max).map((item) => (
        <span
          key={item.id}
          className={cn(
            "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
            item.kind === "milestone"
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-700",
            item.overdue && "ring-1 ring-red-300"
          )}
        >
          {item.title}
        </span>
      ))}
      {dayItems.length > max ? (
        <span className="px-1 text-[10px] text-muted-foreground">
          +{dayItems.length - max} more
        </span>
      ) : null}
    </div>
  );
}

export function GlobalCalendar() {
  const { tasks, milestones, projects } = useWorkspaceStore();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<CursorDate>({
    year: DEMO_NOW.getUTCFullYear(),
    month: DEMO_NOW.getUTCMonth(),
    day: DEMO_NOW.getUTCDate(),
  });
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(
    toDateKey(DEMO_NOW.toISOString())
  );

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  const items = useMemo(() => {
    const list: CalendarItem[] = [];

    for (const task of tasks) {
      if (task.parentId) continue;
      if (projectFilter !== "all" && task.projectId !== projectFilter) continue;
      list.push({
        id: `task-${task.id}`,
        title: task.title,
        date: toDateKey(task.dueDate),
        projectId: task.projectId,
        projectName: task.projectName,
        kind: "task",
        overdue: task.status !== "done" && isOverdue(task.dueDate),
      });
    }

    for (const m of milestones) {
      if (projectFilter !== "all" && m.projectId !== projectFilter) continue;
      list.push({
        id: `ms-${m.id}`,
        title: m.title,
        date: toDateKey(m.dueDate),
        projectId: m.projectId,
        projectName: projectNameById.get(m.projectId) ?? "Project",
        kind: "milestone",
        overdue: m.status !== "completed" && isOverdue(m.dueDate),
      });
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, milestones, projectFilter, projectNameById]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const bucket = map.get(item.date) ?? [];
      bucket.push(item);
      map.set(item.date, bucket);
    }
    return map;
  }, [items]);

  const monthCells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  const weekDays = useMemo(() => buildWeekDays(cursor), [cursor]);

  const activeDayKey =
    viewMode === "day" ? cursorToKey(cursor) : (selectedDay ?? cursorToKey(cursor));
  const selectedItems = byDay.get(activeDayKey) ?? [];
  const todayKey = toDateKey(DEMO_NOW.toISOString());

  function selectDay(key: string) {
    setSelectedDay(key);
    setCursor(keyToCursor(key));
  }

  function goToday() {
    const next = {
      year: DEMO_NOW.getUTCFullYear(),
      month: DEMO_NOW.getUTCMonth(),
      day: DEMO_NOW.getUTCDate(),
    };
    setCursor(next);
    setSelectedDay(cursorToKey(next));
  }

  function shift(delta: number) {
    if (viewMode === "month") {
      setCursor((prev) => {
        const next = new Date(Date.UTC(prev.year, prev.month + delta, 1));
        return {
          year: next.getUTCFullYear(),
          month: next.getUTCMonth(),
          day: 1,
        };
      });
      return;
    }
    if (viewMode === "week") {
      const next = shiftCursor(cursor, delta * 7);
      setCursor(next);
      setSelectedDay(cursorToKey(next));
      return;
    }
    const next = shiftCursor(cursor, delta);
    setCursor(next);
    setSelectedDay(cursorToKey(next));
  }

  const headerTitle =
    viewMode === "month"
      ? monthLabel(cursor.year, cursor.month)
      : viewMode === "week"
        ? weekLabel(weekDays)
        : dayLabel(cursor);

  const headerDescription =
    viewMode === "month"
      ? "Click a day to inspect due items"
      : viewMode === "week"
        ? "Tasks and milestones due this week"
        : "Detailed schedule for the selected day";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Calendar"
        description="Task due dates and milestones across all projects."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={viewMode}
              onValueChange={(value) => {
                if (value === "month" || value === "week" || value === "day") {
                  setViewMode(value);
                  if (value === "day" && selectedDay) {
                    setCursor(keyToCursor(selectedDay));
                  }
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select
              value={projectFilter}
              onValueChange={(v) => v && setProjectFilter(v)}
            >
              <SelectTrigger className="min-w-44">
                <SelectValue>
                  {projectFilter === "all"
                    ? "All projects"
                    : projects.find((p) => p.id === projectFilter)?.name ??
                      "Project"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects
                    .filter((p) => !p.archived)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div
        className={cn(
          "grid gap-5",
          viewMode !== "day" && "lg:grid-cols-[1fr_320px]"
        )}
      >
        <SectionCard
          title={headerTitle}
          description={headerDescription}
          action={
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => shift(-1)}
                aria-label={
                  viewMode === "month"
                    ? "Previous month"
                    : viewMode === "week"
                      ? "Previous week"
                      : "Previous day"
                }
              >
                <ChevronLeft />
              </Button>
              <Button size="sm" variant="ghost" onClick={goToday}>
                Today
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => shift(1)}
                aria-label={
                  viewMode === "month"
                    ? "Next month"
                    : viewMode === "week"
                      ? "Next week"
                      : "Next day"
                }
              >
                <ChevronRight />
              </Button>
            </div>
          }
          bodyClassName={viewMode === "day" ? "p-0" : "p-3 sm:p-4"}
        >
          {viewMode === "month" ? (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-1 pb-2 text-center text-[11px] font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {monthCells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-20 rounded-lg bg-muted/20"
                    />
                  );
                }
                const key = cell.toISOString().slice(0, 10);
                const dayItems = byDay.get(key) ?? [];
                const isSelected = selectedDay === key;
                const isToday = key === todayKey;
                const hasOverdue = dayItems.some((i) => i.overdue);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDay(key)}
                    className={cn(
                      "flex min-h-20 flex-col rounded-lg border border-transparent px-1.5 py-1.5 text-left transition-colors hover:bg-muted/50",
                      isSelected && "border-border bg-muted/40",
                      isToday && !isSelected && "bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-md text-xs font-medium tabular-nums",
                        isToday && "bg-primary text-primary-foreground",
                        hasOverdue && !isToday && "text-red-600"
                      )}
                    >
                      {cell.getUTCDate()}
                    </span>
                    <DayCellContent dayItems={dayItems} />
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "week" ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
              {weekDays.map((cell) => {
                const key = cell.toISOString().slice(0, 10);
                const dayItems = byDay.get(key) ?? [];
                const isSelected = selectedDay === key;
                const isToday = key === todayKey;
                const hasOverdue = dayItems.some((i) => i.overdue);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDay(key)}
                    className={cn(
                      "flex min-h-36 flex-col rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:bg-muted/50",
                      isSelected && "border-border bg-muted/40",
                      isToday && !isSelected && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {WEEKDAYS[cell.getUTCDay()]}
                      </span>
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-md text-xs font-medium tabular-nums",
                          isToday && "bg-primary text-primary-foreground",
                          hasOverdue && !isToday && "text-red-600"
                        )}
                      >
                        {cell.getUTCDate()}
                      </span>
                    </div>
                    <DayCellContent dayItems={dayItems} max={5} />
                  </button>
                );
              })}
            </div>
          ) : null}

          {viewMode === "day" ? <DayItemList items={selectedItems} /> : null}
        </SectionCard>

        {viewMode !== "day" ? (
          <SectionCard
            title={
              selectedDay ? formatShortDate(selectedDay) : "Select a day"
            }
            description={
              selectedDay
                ? `${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"}`
                : "Pick a date on the calendar"
            }
            bodyClassName="p-0"
          >
            <DayItemList items={selectedItems} />
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
