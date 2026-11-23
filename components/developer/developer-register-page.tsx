"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  {
    id: 1,
    label: "Account",
    title: "Create your account",
    description: "Set your login credentials. You’ll verify this email next.",
  },
  {
    id: 2,
    label: "Profile",
    title: "Professional profile",
    description: "Tell us how you present yourself to workspace admins.",
  },
  {
    id: 3,
    label: "Skills",
    title: "Skills & expertise",
    description: "Select the capabilities you’ll bring to marketplace work.",
  },
  {
    id: 4,
    label: "Review",
    title: "Review & submit",
    description: "Confirm your details, then create your developer account.",
  },
] as const;

const SKILL_CATALOG = [
  "React",
  "Next.js",
  "Vue",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "NestJS",
  "PHP",
  "Laravel",
  "Python",
  "Django",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Docker",
  "Kubernetes",
  "GraphQL",
  "REST APIs",
  "Tailwind CSS",
  "SCSS",
  "Figma",
  "CI/CD",
  "Testing",
] as const;

const BENEFITS = [
  {
    icon: Store,
    title: "Discover opportunities",
    body: "Browse curated project openings published by workspace admins.",
  },
  {
    icon: Briefcase,
    title: "Submit competitive proposals",
    body: "Bid with clear scope, pricing, and delivery timelines.",
  },
  {
    icon: FolderKanban,
    title: "Deliver in one workspace",
    body: "Manage assignments, submissions, and collaboration in WorkSphere.",
  },
] as const;

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:w-[44%] xl:w-[42%]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 size-64 rounded-full bg-black/10 blur-3xl" />

      <div className="relative z-10 flex w-full flex-col justify-between px-10 py-10 xl:px-12 xl:py-12">
        <div className="[&_.bg-primary]:bg-white [&_.bg-primary]:text-primary [&_.text-foreground]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/70">
          <WorkSphereLogo />
        </div>

        <div className="mt-16 max-w-md">
          <p className="text-xs font-medium tracking-[0.14em] text-primary-foreground/70 uppercase">
            Developer network
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance xl:text-4xl">
            Build real projects. Compete on merit. Deliver with clarity.
          </h1>
          <p className="mt-4 text-sm leading-6 text-primary-foreground/80">
            WorkSphere connects verified developers with structured marketplace
            opportunities — from proposal to production inside one workspace.
          </p>

          <div className="mt-10 space-y-4">
            {BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-primary-foreground/75">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-white/15 bg-black/10 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <ShieldCheck className="size-3.5" />
            Verified talent pipeline
          </div>
          <p className="mt-1 text-xs leading-5 text-primary-foreground/75">
            Email verification unlocks your portal. Marketplace bidding requires
            a separate admin review.
          </p>
        </div>
      </div>
    </aside>
  );
}

function StepProgress({ step }: { step: number }) {
  return (
    <nav aria-label="Registration steps" className="w-full">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((item) => {
          const active = item.id === step;
          const done = item.id < step;
          return (
            <li key={item.id} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.5} /> : item.id}
                </span>
                <span
                  className={cn(
                    "hidden truncate text-xs sm:inline",
                    active
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
              <div
                className={cn(
                  "mt-2 h-1 rounded-full transition-colors",
                  done || active ? "bg-primary" : "bg-border"
                )}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function DeveloperRegisterPage() {
  const router = useRouter();
  const apiMode = isApiDataSource();

  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [skillList, setSkillList] = useState<string[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [experienceYears, setExperienceYears] = useState("1");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [bio, setBio] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const totalSteps = STEPS.length;
  const currentStep = STEPS[step - 1];
  const strength = passwordScore(password);
  const strengthIssues = passwordStrengthIssues(password);

  const emailRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/login?portal=developer&verified=1"
    )}`;
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const filteredSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    return SKILL_CATALOG.filter(
      (skill) =>
        !skillList.includes(skill) &&
        (!q || skill.toLowerCase().includes(q))
    );
  }, [skillQuery, skillList]);

  function addSkill(skill: string) {
    const next = skill.trim();
    if (!next) return;
    setSkillList((prev) =>
      prev.includes(next) || prev.length >= 20 ? prev : [...prev, next]
    );
    setSkillQuery("");
  }

  function removeSkill(skill: string) {
    setSkillList((prev) => prev.filter((s) => s !== skill));
  }

  function validateStep(current: number): boolean {
    setError(null);
    const nextErrors: Record<string, string> = {};

    if (current === 1) {
      if (!fullName.trim()) nextErrors.fullName = "Full name is required.";
      if (!email.trim()) nextErrors.email = "Email is required.";
      else if (!isValidEmail(email)) nextErrors.email = "Enter a valid email.";
      if (strengthIssues.length) {
        nextErrors.password = `Include ${strengthIssues.join(", ")}.`;
      }
      if (password !== confirm) {
        nextErrors.confirm = "Passwords do not match.";
      }
    }
    if (current === 2) {
      if (!title.trim()) nextErrors.title = "Professional title is required.";
      if (!phone.trim()) nextErrors.phone = "Phone is required.";
    }
    if (current === 3) {
      if (skillList.length === 0) {
        nextErrors.skills = "Add at least one skill.";
      }
      const years = Number(experienceYears);
      if (!Number.isFinite(years) || years < 0) {
        nextErrors.experienceYears = "Enter a valid experience value.";
      }
    }
    if (current === 4) {
      if (!bio.trim()) nextErrors.bio = "A short introduction is required.";
      if (!acceptedTerms) {
        nextErrors.terms =
          "Accept the Terms of Service and Privacy Policy to continue.";
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError(Object.values(nextErrors)[0] ?? "Please fix the highlighted fields.");
      return false;
    }
    return true;
  }

  async function ensureDeveloperOnboarding(sessionEmail: string) {
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
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const draft = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      title: title.trim(),
      skills: skillList,
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
      setResendCooldown(45);
      toast.success("Check your email to verify your account");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
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
      setResendCooldown(45);
      toast.success("Verification email sent again");
    } finally {
      setResending(false);
    }
  }

  if (phase === "check_email" || phase === "done") {
    return (
      <div className="min-h-svh bg-background">
        <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
          <div className="mb-8">
            <WorkSphereLogo />
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Verify your email
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">
                {email || "your inbox"}
              </span>
              . Open it to activate your account, then sign in with your
              password.
            </p>

            <div className="mt-5 space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  After email verification you can access the developer portal.
                </p>
              </div>
              <div className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Marketplace bidding unlocks only after an admin verifies your
                  profile.
                </p>
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-2">
              <Button
                disabled={resending || resendCooldown > 0}
                onClick={() => void handleResend()}
              >
                {resending ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    Sending…
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend available in ${resendCooldown}s`
                ) : (
                  "Resend verification email"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPhase("form");
                  setStep(1);
                  setError(null);
                }}
              >
                Change email
              </Button>
              <Button
                variant="ghost"
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
    <div className="min-h-svh bg-background lg:flex">
      <BrandPanel />

      <main className="flex flex-1 flex-col">
        <div className="border-b border-border px-4 py-4 lg:hidden">
          <WorkSphereLogo />
          <p className="mt-3 text-sm text-muted-foreground">
            Join the WorkSphere developer network and bid on structured project
            work.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-8 lg:max-w-2xl lg:px-12 lg:py-12">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Developer registration
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {currentStep.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {currentStep.description}
              </p>
            </div>
            <p className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs tabular-nums text-muted-foreground">
              {step}/{totalSteps}
            </p>
          </div>

          <StepProgress step={step} />

          <div
            key={step}
            className="mt-8 animate-in fade-in-0 slide-in-from-right-2 duration-300"
          >
            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <FieldShell
                  id="fullName"
                  label="Full name"
                  required
                  error={fieldErrors.fullName}
                >
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Rivera"
                    autoComplete="name"
                    className="h-10"
                    aria-invalid={Boolean(fieldErrors.fullName)}
                  />
                </FieldShell>
                <FieldShell
                  id="email"
                  label="Work email"
                  required
                  error={fieldErrors.email}
                >
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="h-10"
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                </FieldShell>
                <FieldShell
                  id="password"
                  label="Password"
                  required
                  error={fieldErrors.password}
                  hint="At least 8 characters, including a letter and a number."
                >
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      className="h-10 pr-10"
                      aria-invalid={Boolean(fieldErrors.password)}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          strength > i
                            ? strength <= 1
                              ? "bg-destructive"
                              : strength === 2
                                ? "bg-warning"
                                : "bg-success"
                            : "bg-border"
                        )}
                      />
                    ))}
                  </div>
                </FieldShell>
                <FieldShell
                  id="confirm"
                  label="Confirm password"
                  required
                  error={fieldErrors.confirm}
                >
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      className="h-10 pr-10"
                      aria-invalid={Boolean(fieldErrors.confirm)}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FieldShell>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col gap-4">
                <FieldShell
                  id="title"
                  label="Professional title"
                  required
                  hint="Shown on your developer profile and proposals."
                  error={fieldErrors.title}
                >
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Full-stack engineer"
                    className="h-10"
                    aria-invalid={Boolean(fieldErrors.title)}
                  />
                </FieldShell>
                <FieldShell
                  id="phone"
                  label="Phone"
                  required
                  hint="Used by admins for verification follow-up when needed."
                  error={fieldErrors.phone}
                >
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    autoComplete="tel"
                    className="h-10"
                    aria-invalid={Boolean(fieldErrors.phone)}
                  />
                </FieldShell>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-4">
                <FieldShell
                  id="skills"
                  label="Skills"
                  required
                  error={fieldErrors.skills}
                  hint="Select from suggestions or add a custom skill, then press Enter."
                >
                  <div className="rounded-xl border border-input bg-background p-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                    <div className="flex flex-wrap gap-1.5">
                      {skillList.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="gap-1 rounded-md px-2 py-1 text-xs"
                        >
                          {skill}
                          <button
                            type="button"
                            className="rounded-sm text-muted-foreground hover:text-foreground"
                            onClick={() => removeSkill(skill)}
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="relative mt-2">
                      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="skills"
                        value={skillQuery}
                        onChange={(e) => setSkillQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (skillQuery.trim()) addSkill(skillQuery);
                            else if (filteredSkills[0]) addSkill(filteredSkills[0]);
                          }
                        }}
                        placeholder="Search or add a skill"
                        className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                        aria-invalid={Boolean(fieldErrors.skills)}
                      />
                    </div>
                  </div>
                  {filteredSkills.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {filteredSkills.slice(0, 10).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </FieldShell>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldShell
                    id="experienceYears"
                    label="Years of experience"
                    required
                    error={fieldErrors.experienceYears}
                  >
                    <Input
                      id="experienceYears"
                      type="number"
                      min={0}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="h-10"
                      aria-invalid={Boolean(fieldErrors.experienceYears)}
                    />
                  </FieldShell>
                  <FieldShell
                    id="portfolioUrl"
                    label="Portfolio URL"
                    hint="Optional"
                  >
                    <Input
                      id="portfolioUrl"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://"
                      className="h-10"
                    />
                  </FieldShell>
                </div>
                <FieldShell id="githubUrl" label="GitHub URL" hint="Optional">
                  <Input
                    id="githubUrl"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="h-10"
                  />
                </FieldShell>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="flex flex-col gap-5">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Application summary</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setStep(1)}
                    >
                      Edit account
                    </Button>
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Name</dt>
                      <dd className="mt-0.5 font-medium">{fullName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Email</dt>
                      <dd className="mt-0.5 font-medium break-all">
                        {email || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Title</dt>
                      <dd className="mt-0.5 font-medium">{title || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Phone</dt>
                      <dd className="mt-0.5 font-medium">{phone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Experience</dt>
                      <dd className="mt-0.5 font-medium">
                        {experienceYears || "0"} years
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Skills</dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {skillList.length ? (
                          skillList.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span>—</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(2)}
                    >
                      Edit profile
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(3)}
                    >
                      Edit skills
                    </Button>
                  </div>
                </div>

                <FieldShell
                  id="bio"
                  label="Professional introduction"
                  required
                  error={fieldErrors.bio}
                  hint="Share your stack, experience, and the work you want."
                >
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={5}
                    placeholder="I specialize in…"
                    className="min-h-28 resize-y"
                    aria-invalid={Boolean(fieldErrors.bio)}
                  />
                </FieldShell>

                <label className="flex items-start gap-3 rounded-xl border border-border px-3 py-3 text-sm leading-5 text-muted-foreground">
                  <Checkbox
                    checked={acceptedTerms}
                    onCheckedChange={(checked) =>
                      setAcceptedTerms(Boolean(checked))
                    }
                    className="mt-0.5"
                    aria-invalid={Boolean(fieldErrors.terms)}
                  />
                  <span>
                    I agree to the WorkSphere{" "}
                    <span className="font-medium text-foreground">
                      Terms of Service
                    </span>{" "}
                    and{" "}
                    <span className="font-medium text-foreground">
                      Privacy Policy
                    </span>
                    . Marketplace access requires separate admin verification.
                  </span>
                </label>
                {fieldErrors.terms ? (
                  <p className="text-xs text-destructive">{fieldErrors.terms}</p>
                ) : null}

                <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
                  Next: confirm your email, sign in, then wait for admin
                  verification before bidding on opportunities.
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1 || submitting}
              onClick={() => {
                setError(null);
                setFieldErrors({});
                setStep((s) => Math.max(1, s - 1));
              }}
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button
                type="button"
                className="sm:min-w-36"
                onClick={() => {
                  if (!validateStep(step)) return;
                  setStep((s) => s + 1);
                }}
              >
                Continue
                <ArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <Button
                type="button"
                className="sm:min-w-44"
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                    Creating account…
                  </>
                ) : (
                  "Create developer account"
                )}
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground sm:text-left">
            Already have an account?{" "}
            <Link
              href="/login?portal=developer"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
