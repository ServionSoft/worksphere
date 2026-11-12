import { RequireSession } from "@/components/auth/auth-guard";
import { AiAssistant } from "@/components/admin/ai-assistant";

export default function AiPage() {
  return (
    <RequireSession>
      <AiAssistant />
    </RequireSession>
  );
}
