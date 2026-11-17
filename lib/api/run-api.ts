import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { isApiDataSource } from "@/lib/data-source";

/** Fire-and-forget API sync for optimistic store mutations. */
export function runApi(fn: () => Promise<unknown>, label?: string) {
  if (!isApiDataSource()) return;
  void fn().catch((err: unknown) => {
    const message =
      err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Request failed";
    toast.error(label ? `${label}: ${message}` : message);
  });
}
