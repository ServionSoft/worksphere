"use client";

import { Construction } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={description} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Construction className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          {title} is on the roadmap
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          The WorkSphere shell and design system are ready. This module will
          inherit the same layout, tokens and interaction patterns.
        </p>
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => toast(`Notify me when ${title} ships`)}
        >
          Notify me
        </Button>
      </div>
    </div>
  );
}
