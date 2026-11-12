import type { Metadata } from "next";
import { DeveloperSubmissionsPage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Submissions" };

export default function Page() {
  return <DeveloperSubmissionsPage />;
}
