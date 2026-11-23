"use client";

import { Suspense, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-store";
import { PreferencesHydrator } from "@/components/preferences-hydrator";
import { WorkspaceStoreProvider } from "@/lib/workspace-store";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Suspense fallback={null}>
        <AuthProvider>
          <PreferencesHydrator />
          <WorkspaceStoreProvider>{children}</WorkspaceStoreProvider>
        </AuthProvider>
      </Suspense>
    </ThemeProvider>
  );
}
