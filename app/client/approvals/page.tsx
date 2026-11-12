import type { Metadata } from "next";
import { ClientApprovalsPage } from "@/components/client/client-approvals";

export const metadata: Metadata = { title: "Approvals" };

export default function Page() {
  return <ClientApprovalsPage />;
}
