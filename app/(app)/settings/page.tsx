import { RequireSession } from "@/components/auth/auth-guard";
import { WorkspaceSettings } from "@/components/admin/workspace-settings";

export default function SettingsPage() {
  return (
    <RequireSession>
      <WorkspaceSettings />
    </RequireSession>
  );
}
