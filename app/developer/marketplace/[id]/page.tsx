import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { Suspense } from "react";
import { OpportunityDetailPage } from "@/components/developer/opportunity-detail";
import { ProjectDetailFallback } from "@/components/layout/shell-fallback";

export const metadata: Metadata = { title: "Opportunity" };

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireSession>
      <OpportunityDetailPage opportunityId={id} />
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
