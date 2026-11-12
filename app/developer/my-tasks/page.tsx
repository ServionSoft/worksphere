import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { DeveloperAssignmentsPage } from "@/components/developer/developer-assignments";

export const metadata: Metadata = { title: "My Assignments" };

export default function Page() {
  return (
    <RequireSession>
      <DeveloperAssignmentsPage />
    </RequireSession>
  );
}
