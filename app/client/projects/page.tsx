import type { Metadata } from "next";
import { RequireSession } from "@/components/auth/auth-guard";
import { ClientProjectsPage } from "@/components/client/client-projects";

export const metadata: Metadata = { title: "My Projects" };

export default function Page() {
  return (
    <RequireSession>
      <ClientProjectsPage />
    </RequireSession>
  );
}
