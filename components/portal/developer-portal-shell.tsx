"use client";

import { PortalShell } from "@/components/portal/portal-shell";
import { developerNav } from "@/components/portal/portal-nav";

export function DeveloperPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
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
