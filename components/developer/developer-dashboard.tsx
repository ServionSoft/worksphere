"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { developerProjects } from "@/lib/portal-selectors";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function DeveloperDashboard() {
  const { user } = useRequiredAuth();
  const {
    opportunities,
    assignments,
    workSubmissions,
    earnings,
    portalNotifications,
    developers,
    projects,
    tasks,
  } = useWorkspaceStore();

  const developerId = user.developerId ?? "dev1";
  const profile = developers.find((d) => d.id === developerId);
  const mine = assignments.filter((a) => a.developerId === developerId);
  const myProjects = developerProjects(projects, assignments, user, tasks);
  const mySubs = workSubmissions.filter((w) =>
    mine.some((a) => a.id === w.assignmentId)
  );
  const myEarnings = earnings.filter((e) => e.developerId === developerId);
  const openOpps = opportunities.filter((o) => o.status === "open");
  const notes = portalNotifications.filter(
    (n) => n.portal === "developer" && n.userId === user.id
  );

  const kpis = [
    { label: "Available Opportunities", value: openOpps.length },
    {
      label: "Active Assignments",
      value: mine.filter((a) =>
        ["not_started", "in_progress", "revision_requested", "submitted"].includes(
          a.status
        )
      ).length,
    },
    {
      label: "Pending Submissions",
      value: mySubs.filter((s) => s.status === "submitted" || s.status === "in_review")
        .length,
    },
    {
      label: "Completed Tasks",
      value: mine.filter((a) => a.status === "completed" || a.status === "approved")
        .length,
    },
    {
      label: "Pending Payments",
      value: myEarnings.filter((e) => e.status === "pending" || e.status === "approved")
        .length,
    },
    {
      label: "Total Earnings",
      value: formatCurrency(
        myEarnings
          .filter((e) => e.status === "paid")
          .reduce((s, e) => s + e.amount, 0)
      ),
    },
  ];

  const missing: string[] = [];
  if (!profile?.bio?.trim()) missing.push("Introduction");
  if (!profile?.skills?.length) missing.push("Skills");
  if (!profile?.title?.trim()) missing.push("Title");
  if (!profile?.portfolioUrl?.trim()) missing.push("Portfolio");
  const profileComplete = missing.length === 0;
  const verified = profile?.status === "verified";
  const rejected = profile?.status === "rejected";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={
          verified
            ? "Discover opportunities and deliver assigned work."
            : "Complete your profile and wait for admin verification to unlock restricted marketplace actions."
        }
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              render={<Link href="/developer/projects" />}
              nativeButton={false}
            >
              My Projects
            </Button>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/developer/marketplace" />}
              nativeButton={false}
            >
              Marketplace
            </Button>
          </div>
        }
      />

      {!verified ? (
        <SectionCard title="Getting started">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account
              </p>
              <p className="mt-1 text-sm font-medium">Signed in</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Profile
              </p>
              <p className="mt-1 text-sm font-medium">
                {profileComplete ? "Complete" : "Needs attention"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profileComplete
                  ? "Ready for admin review."
                  : `Missing: ${missing.join(", ")}`}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verification
              </p>
              <p className="mt-1 text-sm font-medium capitalize">
                {(profile?.status ?? "pending_verification").replace(/_/g, " ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {rejected
                  ? profile?.verificationNote ||
                    "Update your profile and wait for another review."
                  : "Restricted marketplace actions stay locked until approved."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              render={<Link href="/developer/profile" />}
              nativeButton={false}
            >
              Complete profile
            </Button>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/developer/marketplace" />}
              nativeButton={false}
            >
              Browse open listings
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Recommended opportunities"
          action={
            <Button
              size="sm"
              variant="ghost"
              render={<Link href="/developer/marketplace" />}
              nativeButton={false}
            >
              Browse
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {openOpps.slice(0, 4).map((opp) => (
              <li key={opp.id} className="px-5 py-3">
                <Link
                  href={`/developer/marketplace/${opp.id}`}
                  className="text-sm font-medium hover:text-primary"
                >
                  {opp.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {opp.skills.slice(0, 3).join(" · ")} ·{" "}
                  {formatCurrency(opp.budgetMin)}–
                  {formatCurrency(opp.budgetMax)}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Active assignments"
          action={
            <Button
              size="sm"
              variant="ghost"
              render={<Link href="/developer/my-tasks" />}
              nativeButton={false}
            >
              View all
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {mine.slice(0, 4).map((a) => (
              <li key={a.id} className="px-5 py-3">
                <Link
                  href={`/developer/tasks/${a.id}`}
                  className="text-sm font-medium hover:text-primary"
                >
                  {a.title}
                </Link>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={a.progress} className="flex-1" />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {a.progress}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Due {formatShortDate(a.deadline)} · {a.status.replace("_", " ")}
                  {a.projectId ? (
                    <>
                      {" · "}
                      <Link
                        href={`/developer/projects/${a.projectId}`}
                        className="text-primary hover:underline"
                      >
                        {a.projectName ?? "Project"}
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {myProjects.length > 0 ? (
        <SectionCard
          title="My projects"
          description="Timeline, milestones and tasks for assigned delivery work."
          action={
            <Button
              size="sm"
              variant="ghost"
              render={<Link href="/developer/projects" />}
              nativeButton={false}
            >
              Open
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {myProjects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/developer/projects/${p.id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    PM {p.managerName} · Due {formatShortDate(p.dueDate)} ·{" "}
                    {p.progress}%
                  </p>
                </div>
                <Progress value={p.progress} className="hidden w-28 sm:block" />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Recent submissions" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {mySubs.slice(0, 4).map((s) => (
              <li key={s.id} className="px-5 py-3 text-sm">
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  v{s.version} · {s.status}
                  {s.clientApprovalStatus === "revision_requested"
                    ? " · revision requested"
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Performance" bodyClassName="p-4">
          <p className="text-sm">
            Rating{" "}
            <span className="font-semibold">{profile?.rating ?? "—"}</span>
          </p>
          <p className="mt-2 text-sm">
            On-time{" "}
            <span className="font-semibold">
              {profile?.onTimePercent ?? 0}%
            </span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.completedAssignments ?? 0} completed assignments
          </p>
        </SectionCard>
        <SectionCard title="Notifications" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {notes.slice(0, 4).map((n) => (
              <li key={n.id} className="px-5 py-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
