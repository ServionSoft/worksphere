import { DEMO_NOW } from "@/lib/demo-clock";

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = DEMO_NOW.getTime() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  compact = false
): string {
  if (compact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    const symbol = currency === "USD" ? "$" : `${currency} `;
    if (abs >= 1_000_000) {
      return `${sign}${symbol}${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}${symbol}${Math.round(abs / 1_000)}K`;
    }
    return `${sign}${symbol}${Math.round(abs)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}
