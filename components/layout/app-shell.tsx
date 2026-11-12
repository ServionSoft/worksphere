"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useAuth } from "@/lib/auth-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage(
    "worksphere.sidebar.collapsed",
    false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  if (!user) return children;

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          onOpenMobileNav={() => setMobileOpen(true)}
          onQuickCreate={() => setCreateOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
