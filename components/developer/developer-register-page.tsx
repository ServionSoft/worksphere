"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkSphereLogo } from "@/components/layout/logo";
import { bootstrapProfile, onboard } from "@/lib/api/auth";
import { isApiDataSource } from "@/lib/data-source";
import { isValidEmail } from "@/lib/demo-credentials";
import {
  clearDeveloperRegistrationDraft,
  passwordStrengthIssues,
  saveDeveloperRegistrationDraft,
} from "@/lib/developer-registration";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Phase = "form" | "check_email" | "done";

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Profile" },
  { id: 3, label: "Skills" },
  { id: 4, label: "Review" },
] as const;

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function DeveloperRegisterPage() {
  const router = useRouter();
  const apiMode = isApiDataSource();

  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("");
  const [experienceYears, setExperienceYears] = useState("1");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [bio, setBio] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const totalSteps = STEPS.length;

  const emailRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/login?portal=developer&verified=1"
    )}`;
  }, []);

  function validateStep(current: number): boolean {
    setError(null);
    if (current === 1) {
      if (!fullName.trim() || !email.trim()) {
        setError("Full name and email are required.");
        return false;
      }
      if (!isValidEmail(email)) {
        setError("Enter a valid email address.");
        return false;
      }
      const strength = passwordStrengthIssues(password);
      if (strength.length) {
        setError(`Password must include ${strength.join(", ")}.`);
        return false;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return false;
      }
    }
    if (current === 2) {
      if (!title.trim() || !phone.trim()) {
        setError("Professional title and phone are required.");
        return false;
      }
    }
    if (current === 3) {
      if (!skills.trim()) {
        setError("Add at least one skill.");
        return false;
      }
      const years = Number(experienceYears);
      if (!Number.isFinite(years) || years < 0) {
        setError("Enter a valid experience value.");
        return false;
      }
    }
    if (current === 4) {
      if (!bio.trim()) {
        setError("A short professional introduction is required.");
        return false;
      }
      if (!acceptedTerms) {
        setError("Accept the Terms of Service and Privacy Policy to continue.");
        return false;
      }
    }
    return true;
  }

  async function ensureDeveloperOnboarding(sessionEmail: string) {
    const skillList = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await bootstrapProfile({ fullName: fullName.trim() });
    await onboard({
      kind: "developer",
      developer: {
        title: title.trim(),
        phone: phone.trim(),
        skills: skillList,
        bio: bio.trim(),
        experienceYears: Number(experienceYears) || 0,
        portfolioUrl: portfolioUrl.trim() || "",
        githubUrl: githubUrl.trim() || "",
      },
    });
    clearDeveloperRegistrationDraft();
    void sessionEmail;
  }

  async function handleSubmit() {
    if (!validateStep(4)) return;
    setSubmitting(true);
    setError(null);

    const draft = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      title: title.trim(),
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      experienceYears: Number(experienceYears) || 0,
      portfolioUrl: portfolioUrl.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      bio: bio.trim(),
      acceptedTerms: true,
      createdAt: new Date().toISOString(),
    };
    saveDeveloperRegistrationDraft(draft);

    try {
      if (!apiMode || !isSupabaseConfigured()) {
        toast.message("Demo mode", {
          description:
            "API/Supabase is required for real signup. Use a configured environment to create Auth accounts.",
        });
        setPhase("check_email");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Auth client unavailable.");
        return;
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: draft.email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: draft.fullName,
            portal: "developer",
            title: draft.title,
            phone: draft.phone,
          },
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        return;
      }

      if (data.session) {
        try {
          await ensureDeveloperOnboarding(draft.email);
          setPhase("done");
          toast.success("Account created");
          router.replace("/developer/dashboard");
          return;
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Account created but profile setup failed. Sign in to retry."
          );
          setPhase("check_email");
          return;
        }
      }

      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setError(
          "If this email is available, a verification link will be sent. You may already have an account — try signing in."
        );
      }

      setPhase("check_email");
      toast.success("Check your email to verify your account");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email.trim() || !isValidEmail(email)) {
      setError("Enter the email you registered with.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Auth client unavailable.");
      return;
    }
    setResending(true);
    setError(null);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo },
      });
      if (resendErr) {
        setError(resendErr.message);
        return;
      }
      toast.success("Verification email sent again");
    } finally {
      setResending(false);
    }
  }

  if (phase === "check_email" || phase === "done") {
    return (
      <div className="relative min-h-svh bg-[radial-gradient(ellipse_at_top,_#eef2ff_0%,_#ffffff_50%,_#f8fafc_100%)]">
        <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-10">
          <div className="mb-6 flex flex-col items-center text-center">
            <WorkSphereLogo />
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Verify your email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a link to{" "}
              <span className="font-medium text-foreground">
                {email || "your inbox"}
              </span>
              . Confirm it, then sign in with your password.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="text-xs leading-5 text-muted-foreground">
                After verification you can open the developer portal. Marketplace
                actions stay locked until an admin verifies your profile.
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <Button disabled={resending} onClick={() => void handleResend()}>
                {resending ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    Sending…
                  </>
                ) : (
                  "Resend verification email"
                )}
              </Button>
              <Button
                variant="outline"
                render={<Link href="/login?portal=developer" />}
                nativeButton={false}
              >
                Go to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-svh bg-[radial-gradient(ellipse_at_top,_#eef2ff_0%,_#ffffff_50%,_#f8fafc_100%)]">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <WorkSphereLogo />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Create developer account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Register, verify email, then sign in. Admin verification is separate
            from account access.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
            <nav aria-label="Registration steps" className="flex items-center gap-1.5">
              {STEPS.map((item, index) => {
                const active = item.id === step;
                const done = item.id < step;
                return (
                  <div key={item.id} className="flex items-center gap-1.5">
                    {index > 0 ? (
                      <span
                        className={cn(
                          "h-px w-3 sm:w-4",
                          done || active ? "bg-primary/40" : "bg-border"
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-md text-[11px] font-semibold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.id}
                    </span>
                    <span
                      className={cn(
                        "hidden text-xs sm:inline",
                        active
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </nav>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {step}/{totalSteps}
            </span>
          </div>

          {step === 1 ? (
            <div className="flex flex-col gap-3.5">
              <Field
                id="fullName"
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="Your full name"
                autoComplete="name"
                required
              />
              <Field
                id="email"
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-medium">
                  Password *
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Create password"
                    className="pr-10"
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
                <p className="text-[11px] text-muted-foreground">
                  At least 8 characters, with a letter and a number.
                </p>
              </div>
              <Field
                id="confirm"
                label="Confirm password"
                value={confirm}
                onChange={setConfirm}
                type="password"
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3.5">
              <Field
                id="title"
                label="Professional title"
                value={title}
                onChange={setTitle}
                placeholder="Full-stack engineer"
                required
              />
              <Field
                id="phone"
                label="Phone"
                value={phone}
                onChange={setPhone}
                type="tel"
                placeholder="+1 555 000 0000"
                autoComplete="tel"
                required
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-3.5">
              <Field
                id="skills"
                label="Skills"
                value={skills}
                onChange={setSkills}
                placeholder="React, Node.js, PostgreSQL"
                required
                hint="Comma-separated. You can edit later."
              />
              <Field
                id="experienceYears"
                label="Years of experience"
                value={experienceYears}
                onChange={setExperienceYears}
                type="number"
                required
              />
              <Field
                id="portfolioUrl"
                label="Portfolio URL"
                value={portfolioUrl}
                onChange={setPortfolioUrl}
                placeholder="https://"
                hint="Optional"
              />
              <Field
                id="githubUrl"
                label="GitHub URL"
                value={githubUrl}
                onChange={setGithubUrl}
                placeholder="https://github.com/…"
                hint="Optional"
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bio" className="text-xs font-medium">
                  Short professional introduction *
                </label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  placeholder="Stack, experience, and the work you want."
                />
              </div>
              <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(checked) =>
                    setAcceptedTerms(Boolean(checked))
                  }
                  className="mt-0.5"
                />
                <span>
                  I agree to the WorkSphere Terms of Service and Privacy Policy.
                  Marketplace access requires separate admin verification.
                </span>
              </label>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={step === 1 || submitting}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Back
            </Button>
            {step < totalSteps ? (
              <Button
                onClick={() => {
                  if (!validateStep(step)) return;
                  setStep((s) => s + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login?portal=developer"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
