import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { ApprovalsCenter } from "@/components/admin/approvals-center";

export const metadata: Metadata = {
  title: "Approvals",
};

export default function ApprovalsPage() {
  return (
    <RequireSession>
      <ApprovalsCenter />
    </RequireSession>
  );
}
