"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
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
import { toast } from "sonner";

type Phase = "form" | "check_email" | "done";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
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

  const totalSteps = 4;
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

      // Already confirmed / email confirm disabled → complete onboarding now.
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

      // Identities empty often means email already registered (enumeration-safe message).
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
      <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center gap-5">
        <div className="flex flex-col items-center text-center">
          <WorkSphereLogo />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Verify your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">
              {email || "your inbox"}
            </span>
            . Open it to activate your developer account, then sign in.
          </p>
        </div>
        <SectionCard title="Next steps">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
            <li>Confirm your email from the message we sent.</li>
            <li>Sign in with the password you just created.</li>
            <li>
              Complete your profile and wait for admin verification before
              restricted marketplace actions unlock.
            </li>
          </ol>
          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={resending}
              onClick={() => void handleResend()}
            >
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
              size="sm"
              variant="outline"
              render={<Link href="/login?portal=developer" />}
              nativeButton={false}
            >
              Go to sign in
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Create developer account"
        description={`Step ${step} of ${totalSteps} — register, verify email, then sign in.`}
      />
      <SectionCard title="Developer registration">
        {step === 1 ? (
          <div className="grid max-w-lg gap-3">
            <Field
              label="Full name"
              value={fullName}
              onChange={setFullName}
              required
            />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">Password *</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
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
                Use at least 8 characters with a letter and a number.
              </p>
            </div>
            <Field
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              type="password"
              required
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid max-w-lg gap-3">
            <Field
              label="Professional title"
              value={title}
              onChange={setTitle}
              placeholder="Full-stack engineer"
              required
            />
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              required
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid max-w-lg gap-3">
            <Field
              label="Skills (comma separated)"
              value={skills}
              onChange={setSkills}
              placeholder="React, Node.js, PostgreSQL"
              required
            />
            <Field
              label="Years of experience"
              value={experienceYears}
              onChange={setExperienceYears}
              type="number"
              required
            />
            <Field
              label="Portfolio URL"
              value={portfolioUrl}
              onChange={setPortfolioUrl}
              placeholder="https://"
            />
            <Field
              label="GitHub URL"
              value={githubUrl}
              onChange={setGithubUrl}
              placeholder="https://github.com/…"
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid max-w-lg gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium">
                Short professional introduction *
              </label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                placeholder="What you build, stack, and the kind of work you want."
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I agree to the WorkSphere Terms of Service and Privacy Policy.
                My account can sign in after email verification; marketplace
                access stays pending until an admin verifies my profile.
              </span>
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
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
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            render={<Link href="/login?portal=developer" />}
            nativeButton={false}
          >
            Already have an account?
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
