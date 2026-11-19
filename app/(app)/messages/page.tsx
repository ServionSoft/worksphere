import { RequireSession } from "@/components/auth/auth-guard";
import { MessagingInbox } from "@/components/messaging/messaging-inbox";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return (
    <RequireSession>
      <MessagingInbox portal="admin" />
    </RequireSession>
  );
}
