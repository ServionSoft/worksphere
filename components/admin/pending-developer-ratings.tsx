"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchApiDeveloperReviews,
  moderateApiDeveloperReview,
  type DeveloperReviewDto,
} from "@/lib/api/workspace-api";
import { isApiDataSource } from "@/lib/data-source";
import { formatRelativeTime } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function PendingDeveloperRatings() {
  const { workspace, workspaceId } = useWorkspaceStore();
  const ws = workspaceId || workspace?.id;
  const [pending, setPending] = useState<DeveloperReviewDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ws || !isApiDataSource()) {
      setPending([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchApiDeveloperReviews(ws, {
        moderationStatus: "pending",
      });
      setPending(rows.filter((r) => r.moderationStatus === "pending"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load ratings");
    } finally {
      setLoading(false);
    }
  }, [ws]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(
    reviewId: string,
    decision: "visible" | "hidden"
  ) {
    if (!ws) return;
    setActingId(reviewId);
    try {
      await moderateApiDeveloperReview(ws, reviewId, decision);
      setPending((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success(
        decision === "visible"
          ? "Rating approved — developer score updated"
          : "Rating rejected"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update rating");
    } finally {
      setActingId(null);
    }
  }

  if (!isApiDataSource()) return null;

  return (
    <SectionCard
      title="Developer rating requests"
      description="Client ratings stay pending until you approve. Only approved ratings update the developer’s public score."
      action={
        pending.length > 0 ? (
          <Badge variant="secondary">{pending.length} pending</Badge>
        ) : null
      }
    >
      {loading && pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}
      {!loading && pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rating requests waiting for approval.
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {pending.map((review) => (
          <div
            key={review.id}
            className="rounded-lg border border-border px-3 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {review.developerName ?? "Developer"} ·{" "}
                  {review.overallRating}/5
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {review.clientName ?? "Client"} on{" "}
                  {review.milestoneTitle ?? "milestone"}
                  {review.projectName ? ` · ${review.projectName}` : ""}
                  {review.createdAt
                    ? ` · ${formatRelativeTime(review.createdAt)}`
                    : ""}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Communication {review.communication} · Quality{" "}
                  {review.workQuality} · Timeliness {review.timeliness} ·
                  Professionalism {review.professionalism}
                </p>
                {review.feedback ? (
                  <p className="mt-2 text-sm">{review.feedback}</p>
                ) : null}
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={actingId === review.id}
                onClick={() => void resolve(review.id, "visible")}
              >
                Approve rating
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actingId === review.id}
                onClick={() => void resolve(review.id, "hidden")}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
