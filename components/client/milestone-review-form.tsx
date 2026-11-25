"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/shared/section-card";
import { createApiDeveloperReview } from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`size-8 rounded-md border text-sm ${
              n <= value
                ? "border-foreground bg-foreground text-background"
                : "border-border"
            }`}
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MilestoneReviewForm({
  milestoneId,
  milestoneTitle,
  enabled,
}: {
  milestoneId: string;
  milestoneTitle: string;
  enabled: boolean;
}) {
  const { workspace } = useWorkspaceStore();
  const [overall, setOverall] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [workQuality, setWorkQuality] = useState(5);
  const [timeliness, setTimeliness] = useState(5);
  const [professionalism, setProfessionalism] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!enabled) return null;

  async function submit() {
    if (!isApiDataSource() || !workspace?.id) {
      toast.message("Reviews require API mode");
      return;
    }
    setBusy(true);
    try {
      await createApiDeveloperReview(workspace.id, {
        milestoneId,
        overallRating: overall,
        communication,
        workQuality,
        timeliness,
        professionalism,
        feedback,
      });
      setDone(true);
      toast.success("Review submitted for admin approval");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard
      title={`Rate developer · ${milestoneTitle}`}
      description="Available after this milestone is completed. One review per milestone — an admin must approve before it counts on the developer’s profile."
    >
      {done ? (
        <p className="text-sm text-muted-foreground">
          Thanks — your rating was sent to the admin for approval. It will appear
          on the developer’s profile only after approval.
        </p>
      ) : (
        <div className="space-y-3">
          <StarRow label="Overall" value={overall} onChange={setOverall} />
          <StarRow
            label="Communication"
            value={communication}
            onChange={setCommunication}
          />
          <StarRow
            label="Work quality"
            value={workQuality}
            onChange={setWorkQuality}
          />
          <StarRow label="Timeliness" value={timeliness} onChange={setTimeliness} />
          <StarRow
            label="Professionalism"
            value={professionalism}
            onChange={setProfessionalism}
          />
          <Textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional written feedback"
          />
          <Button disabled={busy} onClick={() => void submit()}>
            {busy ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}
