import { RequireSession } from "@/components/auth/auth-guard";
import { FinanceOverview } from "@/components/admin/finance-overview";

export default function FinancePage() {
  return (
    <RequireSession>
      <FinanceOverview />
    </RequireSession>
  );
}
