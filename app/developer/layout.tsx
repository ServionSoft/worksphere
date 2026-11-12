import { Suspense } from "react";
import { DeveloperRouteShell } from "@/components/portal/developer-route-shell";
import { ShellFallback } from "@/components/layout/shell-fallback";

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <DeveloperRouteShell>{children}</DeveloperRouteShell>
    </Suspense>
  );
}
