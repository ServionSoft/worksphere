"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-store";
import { WorkspaceStoreProvider } from "@/lib/workspace-store";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthProvider>
        <WorkspaceStoreProvider>{children}</WorkspaceStoreProvider>
      </AuthProvider>
    </Suspense>
  );
}
