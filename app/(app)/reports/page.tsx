import { RequireSession } from "@/components/auth/auth-guard";
import { ReportsAnalytics } from "@/components/admin/reports-analytics";

export default function ReportsPage() {
  return (
    <RequireSession>
      <ReportsAnalytics />
    </RequireSession>
  );
}
