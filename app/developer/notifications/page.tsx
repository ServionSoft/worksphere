import type { Metadata } from "next";
import { DeveloperNotificationsPage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <DeveloperNotificationsPage />;
}
