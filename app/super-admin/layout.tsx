import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { ShellFallback } from "@/components/layout/shell-fallback";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthGuard portal="admin" roles={["super_admin"]}>
        <SuperAdminShell>{children}</SuperAdminShell>
      </AuthGuard>
    </Suspense>
  );
}
