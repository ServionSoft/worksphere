import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { ClientNotificationsPage } from "@/components/client/client-secondary-pages";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <RequireSession>
      <ClientNotificationsPage />
    </RequireSession>
  );
}
