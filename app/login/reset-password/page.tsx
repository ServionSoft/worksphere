import type { Metadata } from "next";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";

export const metadata: Metadata = { title: "Set new password" };

export default function Page() {
  return <ResetPasswordPage />;
}
