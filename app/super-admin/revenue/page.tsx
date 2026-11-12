import { RequireSession } from "@/components/auth/auth-guard";
import { SuperAdminRevenue } from "@/components/super-admin/super-admin-pages";

export default function SuperAdminRevenuePage() {
  return (
    <RequireSession>
      <SuperAdminRevenue />
    </RequireSession>
  );
}
