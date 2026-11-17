/**
 * When true, WorkspaceStore hydrates/mutates via Express + Supabase Auth.
 * Demo mode keeps the offline mock store for UI without backend env.
 */
export function isApiDataSource(): boolean {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === "demo") return false;
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === "api") return true;
  return Boolean(
    process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}
