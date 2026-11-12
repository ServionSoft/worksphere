"use client";

import { PortalShell } from "@/components/portal/portal-shell";
import { clientNav } from "@/components/portal/portal-nav";

export function ClientPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      portal="client"
      nav={clientNav}
      brandSubtitle="Client Portal · Nova Retail"
    >
      {children}
    </PortalShell>
  );
}
