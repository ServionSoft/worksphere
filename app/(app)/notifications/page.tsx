import type { Metadata } from "next";
import { RequireSession } from "@/components/auth/auth-guard";
import { NotificationCentre } from "@/components/notifications/notification-centre";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <RequireSession>
      <NotificationCentre portal="admin" settingsHref="/settings?tab=notifications" />
    </RequireSession>
  );
}
