import { RequireSession } from "@/components/auth/auth-guard";
import type { Metadata } from "next";
import { MarketplaceAdmin } from "@/components/admin/marketplace-admin";

export const metadata: Metadata = {
  title: "Developer Marketplace",
};

export default function MarketplacePage() {
  return (
    <RequireSession>
      <MarketplaceAdmin />
    </RequireSession>
  );
}
