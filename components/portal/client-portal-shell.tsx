"use client";

import { PortalShell } from "@/components/portal/portal-shell";
import { clientNav } from "@/components/portal/portal-nav";
import { useAuth } from "@/lib/auth-store";

export function ClientPortalShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // PortalShell calls useRequiredAuth. Mount it only after a session exists
  // so the page slot below can still render and suspend on its own.
  if (!user) return children;

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
