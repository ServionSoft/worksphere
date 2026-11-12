import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { OverviewPage } from "@/components/dashboard/overview-page";

export const metadata: Metadata = {
  title: "Overview",
};

export default function Page() {
  return (
    <RequireSession>
      <OverviewPage />
    </RequireSession>
  );
}
