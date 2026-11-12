import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { DeveloperSettingsPage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Developer Settings" };

export default function Page() {
  return (
    <RequireSession>
      <DeveloperSettingsPage />
    </RequireSession>
  );
}
