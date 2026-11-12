import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireSession } from "@/components/auth/auth-guard";
import { ProjectsView } from "@/components/projects/projects-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Projects",
};

function ProjectsFallback() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsFallback />}>
      <RequireSession>
        <ProjectsView />
      </RequireSession>
    </Suspense>
  );
}
