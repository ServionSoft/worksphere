"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, portalHome } from "@/lib/auth-store";

export function AccessDeniedPage() {
  const { user, logout, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <ShieldAlert className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are not authorized to open this area
          {from ? (
            <>
              {" "}
              (<code className="text-xs">{from}</code>)
            </>
          ) : null}
          . Frontend guards enforce portal roles in demo mode; production must
          enforce this on the server.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {isAuthenticated && user ? (
            <Button
              render={<Link href={portalHome(user.portal)} />}
              nativeButton={false}
            >
              Go to my dashboard
            </Button>
          ) : (
            <Button render={<Link href="/login" />} nativeButton={false}>
              Sign in
            </Button>
          )}
          {isAuthenticated ? (
            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
