import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { DeveloperProfilePage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <RequireSession>
      <DeveloperProfilePage />
    </RequireSession>
  );
}
