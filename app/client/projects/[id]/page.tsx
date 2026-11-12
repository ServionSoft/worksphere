import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientProjectDetail } from "@/components/client/client-project-detail";
import { ProjectDetailFallback } from "@/components/layout/shell-fallback";

export const metadata: Metadata = { title: "Client Project" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientProjectDetail projectId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProjectDetailFallback />}>
      <Content params={params} />
    </Suspense>
  );
}
