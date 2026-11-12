"use client";

import { PortalShell } from "@/components/portal/portal-shell";
import { developerNav } from "@/components/portal/portal-nav";
import { useAuth } from "@/lib/auth-store";

export function DeveloperPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return children;

  return (
    <PortalShell
      portal="developer"
      nav={developerNav}
      brandSubtitle="Developer Portal · Marketplace"
    >
      {children}
    </PortalShell>
  );
}
