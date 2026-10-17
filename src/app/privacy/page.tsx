import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { privacySections } from "@/lib/legal-content";

export const metadata: Metadata = { title: "Privacy Policy" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <LegalPage title="Privacy Policy" sections={privacySections()} />;
}
