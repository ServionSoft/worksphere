import type { Metadata } from "next";
import { ClientDocumentsPage } from "@/components/client/client-secondary-pages";

export const metadata: Metadata = { title: "Documents" };

export default function Page() {
  return <ClientDocumentsPage />;
}
