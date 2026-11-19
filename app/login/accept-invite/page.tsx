import type { Metadata } from "next";
import { Suspense } from "react";
import { AcceptInvitePage } from "@/components/auth/accept-invite-page";

export const metadata: Metadata = {
  title: "Accept invitation",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        </div>
      }
    >
      <AcceptInvitePage />
    </Suspense>
  );
}
