import { Suspense } from "react";
import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { DeveloperMarketplacePage } from "@/components/developer/developer-marketplace";

export const metadata: Metadata = { title: "Marketplace" };

export default function Page() {
  return (
    <RequireSession>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading marketplace…</div>}>
        <DeveloperMarketplacePage />
      </Suspense>
    </RequireSession>
  );
}
