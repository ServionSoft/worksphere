"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DeveloperPortalShell } from "@/components/portal/developer-portal-shell";

/** Protects developer portal routes while leaving /developer/register public. */
export function DeveloperRouteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicRegister =
    pathname === "/developer/register" ||
    pathname.startsWith("/developer/register/");

  if (isPublicRegister) {
    return <>{children}</>;
  }

  return (
    <AuthGuard portal="developer">
      <DeveloperPortalShell>{children}</DeveloperPortalShell>
    </AuthGuard>
  );
}
