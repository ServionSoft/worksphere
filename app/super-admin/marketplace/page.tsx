import { RequireSession } from "@/components/auth/auth-guard";
import { SuperAdminMarketplace } from "@/components/super-admin/super-admin-pages";

export default function SuperAdminMarketplacePage() {
  return (
    <RequireSession>
      <SuperAdminMarketplace />
    </RequireSession>
  );
}
