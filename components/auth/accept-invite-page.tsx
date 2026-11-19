"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkSphereLogo } from "@/components/layout/logo";
import { portalHome } from "@/lib/auth-store";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { toast } from "sonner";

export function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalParam = searchParams.get("portal");
  const portal =
    portalParam === "admin" || portalParam === "developer"
      ? portalParam
      : "client";

  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      if (!isSupabaseConfigured()) {
        setSessionError(
          "Supabase is not configured. Open this invite link in the app environment that has Auth enabled."
        );
        setReady(true);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setSessionError("Unable to initialize Auth client.");
        setReady(true);
        return;
      }

      // Invite links land with tokens in the URL hash; detectSessionInUrl handles them.
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionErr) {
        setSessionError(sessionErr.message);
        setReady(true);
        return;
      }
      if (!data.session) {
        setSessionError(
          "Invite session not found. Open the link from your invitation email, or ask your admin to resend."
        );
        setReady(true);
        return;
      }
      setEmail(data.session.user.email ?? null);
      setReady(true);
    }

    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Auth client unavailable.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      toast.success("Password set — you can continue to your portal");
      const role =
        portal === "admin"
          ? "tenant_admin"
          : portal === "developer"
            ? "developer"
            : "client";
      router.replace(portalHome(portal, role));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-svh bg-[radial-gradient(ellipse_at_top,_#eef2ff_0%,_#ffffff_50%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <WorkSphereLogo />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Accept invitation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set a password to activate your WorkSphere account.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          {!ready ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking invite session…
            </div>
          ) : sessionError ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {sessionError}
              </div>
              <Button
                variant="outline"
                render={<Link href="/login?portal=client" />}
                nativeButton={false}
              >
                Go to sign in
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              {email ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Invited as <span className="font-medium text-foreground">{email}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="invite-password" className="text-xs font-medium">
                  New password
                </label>
                <div className="relative">
                  <Input
                    id="invite-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="invite-confirm" className="text-xs font-medium">
                  Confirm password
                </label>
                <Input
                  id="invite-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    Saving…
                  </>
                ) : (
                  "Set password & continue"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
