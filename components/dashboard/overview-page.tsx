"use client";

import { useState } from "react";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { KpiOverview } from "@/components/dashboard/kpi-overview";
import { ProjectsOverviewTable } from "@/components/dashboard/projects-overview-table";
import { MyWorkPanel } from "@/components/dashboard/my-work-panel";
import { ProgressCharts } from "@/components/dashboard/progress-charts";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

export function OverviewPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <WelcomeSection onCreateProject={() => setCreateOpen(true)} />
      <KpiOverview />
      <ProjectsOverviewTable />
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <MyWorkPanel />
        </div>
        <div className="xl:col-span-2">
          <UpcomingDeadlines />
        </div>
      </div>
      <ProgressCharts />
      <RecentActivity />
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
