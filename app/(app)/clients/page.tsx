import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { ClientsManagement } from "@/components/admin/clients-management";

export const metadata: Metadata = {
  title: "Clients",
};

export default function ClientsPage() {
  return (
    <RequireSession>
      <ClientsManagement />
    </RequireSession>
  );
}
