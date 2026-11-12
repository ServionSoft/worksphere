import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DeveloperPortalShell } from "@/components/portal/developer-portal-shell";
import { ShellFallback } from "@/components/layout/shell-fallback";

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthGuard portal="developer">
        <DeveloperPortalShell>{children}</DeveloperPortalShell>
      </AuthGuard>
    </Suspense>
  );
}
