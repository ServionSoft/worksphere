import { RequireSession } from "@/components/auth/auth-guard";
import { GlobalTimeline } from "@/components/admin/global-timeline";

export default function TimelinePage() {
  return (
    <RequireSession>
      <GlobalTimeline />
    </RequireSession>
  );
}
