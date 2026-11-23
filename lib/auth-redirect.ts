/**
 * Canonical browser origin for Supabase Auth email redirects.
 * Prefer NEXT_PUBLIC_APP_URL in staging/production so links work on phones
 * and never fall through to an empty/null Site URL in Supabase templates.
 */
export function getAppOrigin(): string {
  const configured = sanitizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;

  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = sanitizeOrigin(window.location.origin);
    if (origin) return origin;
  }

  // Vercel preview/production injects this at build/runtime.
  const vercel = sanitizeOrigin(
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined
  );
  if (vercel) return vercel;

  return "http://localhost:3000";
}

function sanitizeOrigin(value: string | undefined | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(/\/$/, "");
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    return null;
  }
  if (!isHttpOrigin(trimmed)) return null;
  return trimmed;
}

function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      url.hostname.toLowerCase() !== "null"
    );
  } catch {
    return false;
  }
}

export function authCallbackUrl(nextPath: string): string {
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${getAppOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
}
