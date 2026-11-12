import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DeveloperProjectDetail } from "@/components/developer/developer-project-detail";
import { ProjectDetailFallback } from "@/components/layout/shell-fallback";

export const metadata: Metadata = { title: "Developer Project" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireSession>
      <DeveloperProjectDetail projectId={id} />
    </RequireSession>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProjectDetailFallback />}>
      <Content params={params} />
    </Suspense>
  );
}
