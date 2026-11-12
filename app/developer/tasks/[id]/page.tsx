import type { Metadata } from "next";
import { Suspense } from "react";
import { AssignmentDetailPage } from "@/components/developer/assignment-detail";
import { ProjectDetailFallback } from "@/components/layout/shell-fallback";

export const metadata: Metadata = { title: "Assignment" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssignmentDetailPage assignmentId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProjectDetailFallback />}>
      <Content params={params} />
    </Suspense>
  );
}
