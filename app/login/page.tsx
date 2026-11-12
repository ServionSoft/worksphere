import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPage } from "@/components/auth/login-page";

export const metadata: Metadata = {
  title: "Sign in",
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
      <LoginPage />
    </Suspense>
  );
}
