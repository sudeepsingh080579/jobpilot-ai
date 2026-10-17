import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { refundSections } from "@/lib/legal-content";

export const metadata: Metadata = { title: "Refund Policy" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <LegalPage title="Refund Policy" sections={refundSections()} />;
}
