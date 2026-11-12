"use client";

import { useCallback, useState } from "react";

function readStorage<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw != null) return JSON.parse(raw) as T;
  } catch {
    // ignore malformed storage
  }
  return initialValue;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initialValue));

  const setStoredValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore quota errors
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, setStoredValue, true] as const;
}
