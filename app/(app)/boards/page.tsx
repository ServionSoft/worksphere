import { RequireSession } from "@/components/auth/auth-guard";
import { GlobalBoards } from "@/components/admin/global-boards";

export default function BoardsPage() {
  return (
    <RequireSession>
      <GlobalBoards />
    </RequireSession>
  );
}
