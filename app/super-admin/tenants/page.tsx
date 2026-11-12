import { RequireSession } from "@/components/auth/auth-guard";
import { SuperAdminTenants } from "@/components/super-admin/super-admin-pages";

export default function SuperAdminTenantsPage() {
  return (
    <RequireSession>
      <SuperAdminTenants />
    </RequireSession>
  );
}
