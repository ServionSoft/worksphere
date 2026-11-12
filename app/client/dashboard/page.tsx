import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { ClientDashboard } from "@/components/client/client-dashboard";

export const metadata: Metadata = { title: "Client Dashboard" };

export default function Page() {
  return (
    <RequireSession>
      <ClientDashboard />
    </RequireSession>
  );
}
