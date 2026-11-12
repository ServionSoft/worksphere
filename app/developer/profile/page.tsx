import type { Metadata } from "next";
import { DeveloperProfilePage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <DeveloperProfilePage />;
}
