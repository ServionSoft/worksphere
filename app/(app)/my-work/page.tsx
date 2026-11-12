"use client";

import { RequireSession } from "@/components/auth/auth-guard";
import { PageHeader } from "@/components/shared/page-header";
import { MyWorkPanel } from "@/components/dashboard/my-work-panel";

export default function MyWorkPage() {
  return (
    <RequireSession>
      <div className="flex flex-col gap-5">
        <PageHeader
          title="My Work"
          description="Stay on top of assigned tasks and update status as you go."
        />
        <MyWorkPanel />
      </div>
    </RequireSession>
  );
}
