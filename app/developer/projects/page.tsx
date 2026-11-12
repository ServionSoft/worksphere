import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { DeveloperProjectsPage } from "@/components/developer/developer-projects";

export const metadata: Metadata = { title: "My Projects" };

export default function Page() {
  return (
    <RequireSession>
      <DeveloperProjectsPage />
    </RequireSession>
  );
}
