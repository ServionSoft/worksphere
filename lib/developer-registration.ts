export const DEV_REGISTRATION_STORAGE_KEY = "worksphere.developer.registration";

export type DeveloperRegistrationDraft = {
  fullName: string;
  email: string;
  phone: string;
  title: string;
  skills: string[];
  experienceYears: number;
  portfolioUrl?: string;
  githubUrl?: string;
  bio: string;
  acceptedTerms: boolean;
  createdAt: string;
};

export function saveDeveloperRegistrationDraft(
  draft: DeveloperRegistrationDraft
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DEV_REGISTRATION_STORAGE_KEY, JSON.stringify(draft));
}

export function readDeveloperRegistrationDraft(): DeveloperRegistrationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DEV_REGISTRATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DeveloperRegistrationDraft;
  } catch {
    return null;
  }
}

export function clearDeveloperRegistrationDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DEV_REGISTRATION_STORAGE_KEY);
}

export function passwordStrengthIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("at least 8 characters");
  if (!/[A-Za-z]/.test(password)) issues.push("a letter");
  if (!/[0-9]/.test(password)) issues.push("a number");
  return issues;
}
