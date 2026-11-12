import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessDeniedPage } from "@/components/auth/access-denied-page";

export const metadata: Metadata = {
  title: "Access denied",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        </div>
      }
    >
      <AccessDeniedPage />
    </Suspense>
  );
}
