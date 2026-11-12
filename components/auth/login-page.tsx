"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Code2,
  Eye,
  EyeOff,
  Loader2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkSphereLogo } from "@/components/layout/logo";
import { useAuth, portalHome } from "@/lib/auth-store";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-credentials";
import type { PortalKind } from "@/lib/portal-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const portals: Array<{
  id: PortalKind;
  title: string;
  description: string;
  icon: typeof Shield;
}> = [
  {
    id: "admin",
    title: "Admin Portal",
    description: "Manage projects, teams, production, clients and developers.",
    icon: Shield,
  },
  {
    id: "client",
    title: "Client Portal",
    description: "Track projects, review deliverables and manage approvals.",
    icon: Building2,
  },
  {
    id: "developer",
    title: "Developer Portal",
    description: "Discover opportunities, manage assignments and submit work.",
    icon: Code2,
  },
];

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [portal, setPortal] = useState<PortalKind | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = searchParams.get("reason");
  const selected = useMemo(
    () => portals.find((p) => p.id === portal) ?? null,
    [portal]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!portal) {
      setError("Select a portal before signing in.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email, password, portal, remember);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Welcome, ${result.user.name}`);
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.replace(
        safeNext ?? portalHome(result.user.portal, result.user.role)
      );
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(kind: PortalKind, email?: string) {
    const account =
      (email
        ? DEMO_ACCOUNTS.find((a) => a.email === email)
        : null) ??
      DEMO_ACCOUNTS.find(
        (a) => a.portal === kind && a.user.role !== "super_admin"
      ) ??
      DEMO_ACCOUNTS.find((a) => a.portal === kind);
    if (!account) return;
    setPortal(account.portal);
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(ellipse_at_top,_#eef2ff_0%,_#ffffff_45%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-size-[24px_24px]" />

      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 flex w-full max-w-xl flex-col items-center text-center">
          <WorkSphereLogo />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Sign in to WorkSphere
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            One Workspace. Complete Control. Choose your portal, then authenticate
            with your credentials.
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur">
            <h2 className="text-sm font-semibold text-foreground">Select portal</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Only one portal can be selected. You can change this anytime.
            </p>
            <div className="mt-4 grid gap-3">
              {portals.map((item) => {
                const Icon = item.icon;
                const active = portal === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => fillDemo(item.id)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "border-border bg-background hover:border-primary/30 hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur sm:p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                {selected ? `Sign in · ${selected.title}` : "Sign in"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected
                  ? `Authenticate to open the ${selected.title}.`
                  : "Select a portal to continue."}
              </p>
            </div>

            {reason === "expired" ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Your demo session expired. Please sign in again.
              </div>
            ) : null}

            <form className="flex flex-col gap-3.5" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-medium">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium">
                    Password
                  </label>
                  <Link
                    href="/login/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-10"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(Boolean(checked))}
                  disabled={submitting}
                />
                Remember me on this device
              </label>

              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-9 w-full"
                disabled={submitting || !portal}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              {portal === "developer" ? (
                <p className="text-center text-xs text-muted-foreground">
                  New to the developer portal?{" "}
                  <Link
                    href="/developer/register"
                    className="font-medium text-primary hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              ) : null}
            </form>

            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Demo mode
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Password for all accounts: <code className="font-mono">{DEMO_PASSWORD}</code>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => fillDemo(account.portal, account.email)}
                    disabled={submitting}
                  >
                    {account.user.role === "super_admin"
                      ? "super admin"
                      : account.portal}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Mock authentication is for UI/dev only — not production security.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
