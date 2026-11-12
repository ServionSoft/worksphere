import type { Metadata } from "next";
import { ClientProjectsPage } from "@/components/client/client-projects";

export const metadata: Metadata = { title: "My Projects" };

export default function Page() {
  return <ClientProjectsPage />;
}
