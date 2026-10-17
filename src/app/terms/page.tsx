import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { termsSections } from "@/lib/legal-content";

export const metadata: Metadata = { title: "Terms of Service" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <LegalPage title="Terms of Service" sections={termsSections()} />;
}
