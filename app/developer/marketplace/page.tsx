import type { Metadata } from "next";
import { DeveloperMarketplacePage } from "@/components/developer/developer-marketplace";

export const metadata: Metadata = { title: "Marketplace" };

export default function Page() {
  return <DeveloperMarketplacePage />;
}
