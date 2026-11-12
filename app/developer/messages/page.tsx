import type { Metadata } from "next";
import { DeveloperMessagesPage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <DeveloperMessagesPage />;
}
