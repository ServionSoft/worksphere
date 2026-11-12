import { Suspense } from "react";
import { GuestOnly } from "@/components/auth/auth-guard";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        </div>
      }
    >
      <GuestOnly>{children}</GuestOnly>
    </Suspense>
  );
}
