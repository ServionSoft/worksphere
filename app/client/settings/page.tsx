import type { Metadata } from "next";
import { ClientSettingsPage } from "@/components/client/client-secondary-pages";

export const metadata: Metadata = { title: "Client Settings" };

export default function Page() {
  return <ClientSettingsPage />;
}
