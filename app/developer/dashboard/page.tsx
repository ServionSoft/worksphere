import type { Metadata } from "next";
import { DeveloperDashboard } from "@/components/developer/developer-dashboard";

export const metadata: Metadata = { title: "Developer Dashboard" };

export default function Page() {
  return <DeveloperDashboard />;
}
