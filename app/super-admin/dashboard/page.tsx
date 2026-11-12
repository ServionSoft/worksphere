import { RequireSession } from "@/components/auth/auth-guard";
import { SuperAdminOverview } from "@/components/super-admin/super-admin-pages";

export default function SuperAdminDashboardPage() {
  return (
    <RequireSession>
      <SuperAdminOverview />
    </RequireSession>
  );
}
