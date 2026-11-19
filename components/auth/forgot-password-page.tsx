"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkSphereLogo } from "@/components/layout/logo";
import { useAuth } from "@/lib/auth-store";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
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
            Reset password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your account email. If it exists, we will send a secure reset
            link via Supabase Auth.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-email" className="text-xs font-medium">
                Email address
              </label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@worksphere.demo"
                disabled={submitting}
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {message}
              </div>
            ) : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Processing...
                </>
              ) : (
                "Send reset instructions"
              )}
            </Button>
          </form>

          <p className="mt-4 text-xs text-muted-foreground">
            Prefer using the test account buttons on the sign-in page.
          </p>

          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            render={<Link href="/login" />}
            nativeButton={false}
          >
            <ArrowLeft data-icon="inline-start" />
            Back to sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
