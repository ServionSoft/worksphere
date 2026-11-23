import { RequireSession } from "@/components/auth/auth-guard";
import { NotificationCentre } from "@/components/notifications/notification-centre";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform notifications" };

export default function SuperAdminNotificationsPage() {
  return (
    <RequireSession>
      <NotificationCentre
        portal="admin"
        settingsHref="/super-admin/settings"
      />
    </RequireSession>
  );
}
