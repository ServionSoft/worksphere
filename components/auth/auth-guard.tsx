"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, portalHome } from "@/lib/auth-store";
import {
  portalForPath,
  roleMatchesPortal,
} from "@/lib/auth-session";
import type { AppRole, PortalKind } from "@/lib/portal-types";
import { ShellFallback } from "@/components/layout/shell-fallback";

interface AuthGuardProps {
  children: React.ReactNode;
  portal: PortalKind;
  /** When set, user.role must be one of these (in addition to portal match). */
  roles?: AppRole[];
}

export function AuthGuard({ children, portal, roles }: AuthGuardProps) {
  const { user, hydrated, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const portalOk =
    !!user && roleMatchesPortal(user.role, portal) && user.portal === portal;
  const roleOk = !roles?.length || (!!user && roles.includes(user.role));
  const allowed = portalOk && roleOk;

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !user) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!allowed) {
      router.replace(`/access-denied?from=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, user, allowed, router, pathname]);

  // Always keep `children` mounted. Replacing them with the fallback drops the
  // page segment, so Cache Components cannot validate instant navigation.
  const blocked = !hydrated || !isAuthenticated || !user || !allowed;

  return (
    <>
      {blocked ? (
        <div className="fixed inset-0 z-50">
          <ShellFallback />
        </div>
      ) : null}
      <div className={blocked ? "hidden" : "contents"} inert={blocked}>
        {children}
      </div>
    </>
  );
}

/** Mount protected page content only after a client session exists. */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return children;
}

/** Redirect authenticated users away from public auth pages. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, hydrated, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated && user) {
      router.replace(portalHome(user.portal, user.role));
    }
  }, [hydrated, isAuthenticated, user, router]);

  // Keep the login segment mounted. Swapping it for a placeholder drops the
  // page from instant-navigation validation while the session is still hydrating.
  const blocked = !hydrated || (isAuthenticated && !!user);

  void pathname;
  void portalForPath;

  return (
    <>
      {blocked ? (
        <div className="fixed inset-0 z-50 flex min-h-svh items-center justify-center bg-background">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        </div>
      ) : null}
      <div className={blocked ? "hidden" : "contents"} inert={blocked}>
        {children}
      </div>
    </>
  );
}
