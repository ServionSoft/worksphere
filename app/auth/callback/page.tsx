"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkSphereLogo } from "@/components/layout/logo";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const next = searchParams.get("next") || "/login?portal=developer";
      if (!isSupabaseConfigured()) {
        setError("Supabase Auth is not configured in this environment.");
        return;
      }
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Unable to initialize Auth client.");
        return;
      }

      // Hash tokens / PKCE code are processed by detectSessionInUrl.
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionErr) {
        setError(sessionErr.message);
        return;
      }
      if (!data.session) {
        // Some confirm links land with query params instead of hash.
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeErr } =
            await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exchangeErr) {
            setError(exchangeErr.message);
            return;
          }
        } else {
          setError(
            "Verification session not found. The link may be expired — request a new email and try again."
          );
          return;
        }
      }

      router.replace(next);
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="relative min-h-svh bg-[radial-gradient(ellipse_at_top,_#eef2ff_0%,_#ffffff_50%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
        <WorkSphereLogo />
        {error ? (
          <div className="mt-8 w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
            <h1 className="text-lg font-semibold">Could not verify</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                render={<Link href="/developer/register" />}
                nativeButton={false}
              >
                Back to registration
              </Button>
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/login?portal=developer" />}
                nativeButton={false}
              >
                Sign in
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Completing verification…
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
