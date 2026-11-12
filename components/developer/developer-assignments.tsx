"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { AssignmentStatus } from "@/lib/portal-types";

const tabs: Array<"all" | AssignmentStatus> = [
  "all",
  "not_started",
  "in_progress",
  "submitted",
  "revision_requested",
  "approved",
  "completed",
];

export function DeveloperAssignmentsPage() {
  const { user } = useRequiredAuth();
  const { assignments } = useWorkspaceStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const mine = assignments.filter((a) => a.developerId === user.developerId);

  const filtered = useMemo(
    () => (tab === "all" ? mine : mine.filter((a) => a.status === tab)),
    [mine, tab]
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Assignments"
        description="Accepted and confirmed work. Other developers' private submissions stay hidden."
      />
      <Tabs
        value={tab}
        onValueChange={(v) => typeof v === "string" && setTab(v as typeof tab)}
      >
        <TabsList className="h-auto flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t.replace("_", " ")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-3">
        {filtered.map((a) => (
          <Link
            key={a.id}
            href={`/developer/tasks/${a.id}`}
            className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">{a.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {a.projectName ?? "Independent"} · {formatCurrency(a.budget, a.currency)} · Due{" "}
                  {formatShortDate(a.deadline)}
                </p>
              </div>
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {a.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={a.progress} className="flex-1" />
              <span className="text-xs tabular-nums">{a.progress}%</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
            No assignments in this tab.
          </div>
        ) : null}
      </div>
    </div>
  );
}
