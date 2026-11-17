"use client";

import { useEffect, useState } from "react";
import {
  createSignedFileUrl,
  parseFileRef,
} from "@/lib/supabase/submission-storage";

export function SubmissionDeliverables({
  files,
  repoUrl,
  deployUrl,
  designUrl,
  testingNotes,
  compact = false,
}: {
  files?: string[];
  repoUrl?: string;
  deployUrl?: string;
  designUrl?: string;
  testingNotes?: string;
  compact?: boolean;
}) {
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const next: Record<string, string> = {};
      for (const ref of files ?? []) {
        const parsed = parseFileRef(ref);
        if (parsed.kind === "storage" && parsed.path) {
          const url = await createSignedFileUrl(parsed.path);
          if (url) next[ref] = url;
        } else if (parsed.kind === "url" && parsed.url) {
          next[ref] = parsed.url;
        }
      }
      if (!cancelled) setSigned(next);
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const hasLinks = Boolean(repoUrl || deployUrl || designUrl);
  const hasFiles = (files?.length ?? 0) > 0;
  const hasNotes = Boolean(testingNotes?.trim());

  if (!hasLinks && !hasFiles && !hasNotes) return null;

  return (
    <div className={compact ? "mt-2 space-y-1.5" : "mt-3 space-y-2"}>
      {hasNotes ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Testing notes:</span>{" "}
          {testingNotes}
        </p>
      ) : null}

      {hasLinks ? (
        <div className="flex flex-wrap gap-3 text-xs">
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Repository
            </a>
          ) : null}
          {designUrl ? (
            <a
              href={designUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Design / Figma
            </a>
          ) : null}
          {deployUrl ? (
            <a
              href={deployUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Live preview
            </a>
          ) : null}
        </div>
      ) : null}

      {hasFiles ? (
        <ul className="flex flex-col gap-1">
          {(files ?? []).map((ref) => {
            const parsed = parseFileRef(ref);
            const href = signed[ref];
            return (
              <li key={ref} className="text-xs">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {parsed.name}
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    {parsed.name}
                    {parsed.kind === "storage"
                      ? " (signed link unavailable)"
                      : ""}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
