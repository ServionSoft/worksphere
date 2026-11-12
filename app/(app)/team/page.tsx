import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { TeamManagement } from "@/components/admin/team-management";

export const metadata: Metadata = {
  title: "Team Members",
};

export default function TeamPage() {
  return (
    <RequireSession>
      <TeamManagement />
    </RequireSession>
  );
}
