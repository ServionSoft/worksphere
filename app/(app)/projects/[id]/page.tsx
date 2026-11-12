import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectDetailPage } from "@/components/projects/detail/project-detail-page";
import { ProjectDetailFallback } from "@/components/layout/shell-fallback";

export const metadata: Metadata = {
  title: "Project details",
};

async function ProjectDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailPage projectId={id} />;
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProjectDetailFallback />}>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}
