import type { Metadata } from "next";
import { LEGAL_CONTACT, LEGAL_ENTITY, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        { heading: "1. Agreement", body: [`These Terms are an agreement between you and ${LEGAL_ENTITY} ("we") for use of JobPilot AI (the "Service"). By creating an account you accept them. If you use the Service for an organisation, you confirm you may bind it.`] },
        { heading: "2. Accounts", body: ["You must be at least 16 years old (or the age of digital consent where you live). Keep your password safe; you are responsible for activity on your account. Tell us promptly about any unauthorised use."] },
        { heading: "3. Free trial and plans", body: ["New accounts get a 7-day Pro trial without a payment method. When it ends the account moves to the Free plan unless you subscribe. Plan features and AI allowances are described on the Pricing page and may change with notice."] },
        { heading: "4. Subscriptions and billing", body: ["Paid plans (Pro Monthly, Pro Annual) renew automatically at the end of each billing period until cancelled. Payments are processed by Stripe. Prices exclude taxes, which are added where required. You can cancel at any time in Settings → Billing; access continues until the end of the paid period. We may change prices with at least 30 days' notice before your next renewal."] },
        { heading: "5. AI output", body: ["The Service uses AI models to draft text. Output may be inaccurate or incomplete. Review everything before you use or send it. You are responsible for what you submit to employers and contacts. We never send messages or apply to jobs on your behalf."] },
        { heading: "6. Acceptable use", body: ["Do not misuse the Service: no unlawful use, no attempts to break security or limits, no scraping, no automated use of third-party sites through the Service in breach of their terms, and no content that infringes others' rights."] },
        { heading: "7. Your content", body: ["You own the content you upload (for example resumes). You grant us a limited licence to host and process it only to provide the Service. You can export or delete it at any time."] },
        { heading: "8. Availability and changes", body: ["We aim for high availability but do not guarantee the Service will be uninterrupted. We may change or discontinue features with reasonable notice."] },
        { heading: "9. Disclaimers and liability", body: ["The Service is provided \"as is\". We do not guarantee interviews, offers or any job outcome. To the extent permitted by law, our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing limits liability that cannot be limited by law, including statutory consumer rights."] },
        { heading: "10. Termination", body: ["You can close your account at any time from Settings. We may suspend accounts that breach these Terms."] },
        { heading: "11. Law and disputes", body: ["[Governing law and venue to be chosen with your lawyer.] Consumers keep the protections of the law of the country where they live."] },
        { heading: "12. Contact", body: [`Questions: ${LEGAL_CONTACT}.`] },
      ]}
    />
  );
}
