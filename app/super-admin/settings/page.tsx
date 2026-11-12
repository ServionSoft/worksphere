import { RequireSession } from "@/components/auth/auth-guard";
import { SuperAdminSettings } from "@/components/super-admin/super-admin-pages";

export default function SuperAdminSettingsPage() {
  return (
    <RequireSession>
      <SuperAdminSettings />
    </RequireSession>
  );
}
