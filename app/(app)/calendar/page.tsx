import { RequireSession } from "@/components/auth/auth-guard";
import { GlobalCalendar } from "@/components/admin/global-calendar";

export default function CalendarPage() {
  return (
    <RequireSession>
      <GlobalCalendar />
    </RequireSession>
  );
}
