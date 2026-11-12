import type { Metadata } from "next";
import { ClientMessagesPage } from "@/components/client/client-secondary-pages";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <ClientMessagesPage />;
}
