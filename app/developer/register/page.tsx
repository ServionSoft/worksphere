import type { Metadata } from "next";
import { DeveloperRegisterPage } from "@/components/developer/developer-secondary";

export const metadata: Metadata = { title: "Register" };

export default function Page() {
  return <DeveloperRegisterPage />;
}
