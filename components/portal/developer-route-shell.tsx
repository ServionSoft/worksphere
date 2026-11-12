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
    return (
      <div className="min-h-svh bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <AuthGuard portal="developer">
      <DeveloperPortalShell>{children}</DeveloperPortalShell>
    </AuthGuard>
  );
}
