import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ClientPortalShell } from "@/components/portal/client-portal-shell";
import { ShellFallback } from "@/components/layout/shell-fallback";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthGuard portal="client">
        <ClientPortalShell>{children}</ClientPortalShell>
      </AuthGuard>
    </Suspense>
  );
}
