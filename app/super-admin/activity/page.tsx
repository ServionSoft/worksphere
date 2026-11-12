import { RequireSession } from "@/components/auth/auth-guard";
import { SuperAdminActivity } from "@/components/super-admin/super-admin-pages";

export default function SuperAdminActivityPage() {
  return (
    <RequireSession>
      <SuperAdminActivity />
    </RequireSession>
  );
}
