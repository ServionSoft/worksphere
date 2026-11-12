"use client";

import { CalendarDays, FolderPlus, ListPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/lib/mock-data";
import { greetingForHour } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

interface WelcomeSectionProps {
  onCreateProject: () => void;
}

export function WelcomeSection({ onCreateProject }: WelcomeSectionProps) {
  const { workspace } = useWorkspaceStore();
  const today = new Date("2026-03-11").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          {workspace.name}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {greetingForHour(10)}, {currentUser.name.split(" ")[0]}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" />
          {today} · Here is what needs attention today
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onCreateProject}>
          <FolderPlus data-icon="inline-start" />
          New project
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast("Task composer opens in My Work")}
        >
          <ListPlus data-icon="inline-start" />
          Add task
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => toast("Invite flow coming soon")}
        >
          <Users data-icon="inline-start" />
          Invite
        </Button>
      </div>
    </section>
  );
}
