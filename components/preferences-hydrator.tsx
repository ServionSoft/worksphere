"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { fetchPreferences } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-store";
import { isApiDataSource } from "@/lib/data-source";

/** Loads persisted application preferences once after auth and applies theme. */
export function PreferencesHydrator() {
  const { isAuthenticated, hydrated } = useAuth();
  const { setTheme } = useTheme();
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !isApiDataSource()) return;

    let cancelled = false;
    void (async () => {
      try {
        const prefs = await fetchPreferences();
        if (cancelled) return;
        const key = `${prefs.application.theme}:${prefs.application.timezone}`;
        if (loadedFor.current === key) return;
        loadedFor.current = key;
        setTheme(prefs.application.theme);
        try {
          window.localStorage.setItem(
            "worksphere.user.applicationPrefs",
            JSON.stringify(prefs.application)
          );
        } catch {
          /* ignore quota */
        }
      } catch {
        /* non-fatal */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated, setTheme]);

  return null;
}
