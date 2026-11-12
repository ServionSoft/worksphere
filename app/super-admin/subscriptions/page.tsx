import { RequireSession } from "@/components/auth/auth-guard";
import { SuperAdminSubscriptions } from "@/components/super-admin/super-admin-pages";

export default function SuperAdminSubscriptionsPage() {
  return (
    <RequireSession>
      <SuperAdminSubscriptions />
    </RequireSession>
  );
}
