"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, portalHome } from "@/lib/auth-store";
import {
  portalForPath,
  roleMatchesPortal,
} from "@/lib/auth-session";
import type { PortalKind } from "@/lib/portal-types";
import { ShellFallback } from "@/components/layout/shell-fallback";

interface AuthGuardProps {
  children: React.ReactNode;
  portal: PortalKind;
}

export function AuthGuard({ children, portal }: AuthGuardProps) {
  const { user, hydrated, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !user) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!roleMatchesPortal(user.role, portal) || user.portal !== portal) {
      router.replace(`/access-denied?from=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, user, portal, router, pathname]);

  if (!hydrated) {
    return <ShellFallback />;
  }

  if (!isAuthenticated || !user) {
    return <ShellFallback />;
  }

  if (!roleMatchesPortal(user.role, portal) || user.portal !== portal) {
    return <ShellFallback />;
  }

  return <>{children}</>;
}

/** Redirect authenticated users away from public auth pages. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, hydrated, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated && user) {
      router.replace(portalHome(user.portal));
    }
  }, [hydrated, isAuthenticated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  // Silence unused when path is public
  void pathname;
  void portalForPath;

  return <>{children}</>;
}
