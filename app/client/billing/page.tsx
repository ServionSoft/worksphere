import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { ClientBillingPage } from "@/components/client/client-secondary-pages";

export const metadata: Metadata = { title: "Billing" };

export default function Page() {
  return (
    <RequireSession>
      <ClientBillingPage />
    </RequireSession>
  );
}
