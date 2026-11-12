/** Fixed demo clock so prerender stays deterministic under cacheComponents. */
export const DEMO_NOW = new Date("2026-03-11T12:00:00Z");
export const DEMO_NOW_ISO = "2026-03-11T12:00:00Z";
export const DEMO_TS = "2026-03-11T12:05:00Z";

export function demoId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}
