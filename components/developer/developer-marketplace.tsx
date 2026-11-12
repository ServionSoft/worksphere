"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useRequiredAuth } from "@/lib/auth-store";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { toast } from "sonner";

type MarketTab = "browse" | "saved" | "applications";

export function DeveloperMarketplacePage() {
  const { user } = useRequiredAuth();
  const {
    opportunities,
    quotations,
    assignments,
    savedOpportunityIds,
    saveOpportunity,
    unsaveOpportunity,
    developers,
  } = useWorkspaceStore();
  const profile = developers.find((d) => d.id === user.developerId);
  const developerId = user.developerId ?? "";
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("all");
  const [pricing, setPricing] = useState<"all" | "fixed" | "quotation">("all");
  const [sort, setSort] = useState<"deadline" | "budget">("deadline");
  const [tab, setTab] = useState<MarketTab>("browse");

  const skills = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => o.skills.forEach((s) => set.add(s)));
    return ["all", ...Array.from(set)];
  }, [opportunities]);

  const visibleOpportunities = useMemo(
    () =>
      opportunities.filter(
        (o) =>
          o.status === "open" &&
          (o.visibility === "public" ||
            (o.invitedDeveloperIds ?? []).includes(developerId))
      ),
    [opportunities, developerId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base =
      tab === "saved"
        ? visibleOpportunities.filter((o) => savedOpportunityIds.includes(o.id))
        : visibleOpportunities;

    return base
      .filter((o) => (pricing === "all" ? true : o.pricing === pricing))
      .filter((o) => (skill === "all" ? true : o.skills.includes(skill)))
      .filter(
        (o) =>
          !q ||
          o.title.toLowerCase().includes(q) ||
          o.summary.toLowerCase().includes(q) ||
          o.skills.some((s) => s.toLowerCase().includes(q))
      )
      .sort((a, b) =>
        sort === "deadline"
          ? a.deadline.localeCompare(b.deadline)
          : b.budgetMax - a.budgetMax
      );
  }, [
    visibleOpportunities,
    query,
    skill,
    pricing,
    sort,
    tab,
    savedOpportunityIds,
  ]);

  const myQuotations = useMemo(
    () =>
      quotations
        .filter((q) => q.developerId === developerId)
        .slice()
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [quotations, developerId]
  );

  const myFixedAccepts = useMemo(
    () =>
      assignments
        .filter(
          (a) =>
            a.developerId === developerId &&
            Boolean(a.opportunityId) &&
            [
              "pending_confirmation",
              "not_started",
              "in_progress",
              "submitted",
              "revision_requested",
              "approved",
              "completed",
            ].includes(a.status)
        )
        .slice()
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [assignments, developerId]
  );

  const applicationCount = myQuotations.length + myFixedAccepts.length;

  const statusLabel = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Marketplace"
        description={
          profile?.status === "verified"
            ? "Browse admin-published technical opportunities."
            : "Some restricted assignments require verified developer status."
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => typeof v === "string" && setTab(v as MarketTab)}
      >
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="saved">
            Saved ({savedOpportunityIds.length})
          </TabsTrigger>
          <TabsTrigger value="applications">
            My applications ({applicationCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab !== "applications" ? (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search opportunities..."
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              >
                {skills.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All skills" : s}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={pricing}
                onChange={(e) => setPricing(e.target.value as typeof pricing)}
              >
                <option value="all">All pricing</option>
                <option value="fixed">Fixed price</option>
                <option value="quotation">Quotation</option>
              </select>
              <select
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="deadline">Sort by deadline</option>
                <option value="budget">Sort by budget</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {filtered.map((opp) => {
              const saved = savedOpportunityIds.includes(opp.id);
              return (
                <article
                  key={opp.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/developer/marketplace/${opp.id}`}
                        className="text-sm font-semibold hover:text-primary hover:underline"
                      >
                        {opp.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {opp.summary}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {opp.skills.map((s) => (
                          <Badge key={s} variant="secondary">
                            {s}
                          </Badge>
                        ))}
                        <Badge variant="outline">{opp.pricing}</Badge>
                        <Badge variant="outline">{opp.experienceLevel}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatCurrency(opp.budgetMin)}–
                        {formatCurrency(opp.budgetMax)} · {opp.estimatedDays}{" "}
                        days · Due {formatShortDate(opp.deadline)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={() => {
                          if (saved) {
                            unsaveOpportunity(opp.id);
                            toast.message("Removed from saved");
                          } else {
                            saveOpportunity(opp.id, developerId || "dev1");
                            toast.success("Opportunity saved");
                          }
                        }}
                        aria-label="Save opportunity"
                      >
                        <Bookmark
                          className={saved ? "fill-primary text-primary" : ""}
                        />
                      </Button>
                      <Button
                        size="sm"
                        render={
                          <Link href={`/developer/marketplace/${opp.id}`} />
                        }
                        nativeButton={false}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
                {tab === "saved"
                  ? "No saved opportunities yet."
                  : "No opportunities match your filters."}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <SectionCard title="My applications" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {myQuotations.map((q) => {
              const opp = opportunities.find((o) => o.id === q.opportunityId);
              return (
                <li
                  key={`q-${q.id}`}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">Quotation</Badge>
                      <Badge variant="outline">{statusLabel(q.status)}</Badge>
                    </div>
                    <Link
                      href={`/developer/marketplace/${q.opportunityId}`}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {opp?.title ?? q.opportunityId}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(q.price)} · {q.estimatedDays} days · Submitted{" "}
                      {formatShortDate(q.submittedAt)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {q.coverMessage}
                    </p>
                  </div>
                </li>
              );
            })}
            {myFixedAccepts.map((a) => {
              const opp = opportunities.find((o) => o.id === a.opportunityId);
              return (
                <li
                  key={`a-${a.id}`}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">Fixed-price acceptance</Badge>
                      <Badge variant="outline">{statusLabel(a.status)}</Badge>
                    </div>
                    <Link
                      href={`/developer/marketplace/${a.opportunityId}`}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {opp?.title ?? a.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(a.budget, a.currency)} · Due{" "}
                      {formatShortDate(a.deadline)} · Started{" "}
                      {formatShortDate(a.startDate)}
                    </p>
                  </div>
                  {a.status !== "pending_confirmation" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/developer/tasks/${a.id}`} />}
                      nativeButton={false}
                    >
                      Open assignment
                    </Button>
                  ) : null}
                </li>
              );
            })}
            {applicationCount === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                No quotations or fixed-price acceptances yet.
              </li>
            ) : null}
          </ul>
        </SectionCard>      )}
    </div>
  );
}
