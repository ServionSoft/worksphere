import type { Metadata } from "next";
import { DeveloperEarningsPage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Earnings" };

export default function Page() {
  return <DeveloperEarningsPage />;
}
