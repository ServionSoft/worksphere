import type { Metadata } from "next";
import { DeveloperRegisterPage } from "@/components/developer/developer-register-page";

export const metadata: Metadata = { title: "Developer registration" };

export default function Page() {
  return <DeveloperRegisterPage />;
}
