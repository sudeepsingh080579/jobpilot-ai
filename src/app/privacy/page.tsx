import type { Metadata } from "next";
import { LEGAL_CONTACT, LEGAL_ENTITY, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { heading: "Who we are", body: [`${LEGAL_ENTITY} is the controller of personal data processed in JobPilot AI. Contact: ${LEGAL_CONTACT}. [Add EU/UK representative and DPO details if required.]`] },
        { heading: "What we collect", body: ["Account data (name, email, hashed password). Profile and job-search content you add (resumes, jobs, notes, contacts you enter, drafts). Billing data handled by Stripe (we store your Stripe customer id, plan and status, never full card numbers). Technical data (IP address for security and rate limiting, essential cookies)."] },
        { heading: "Why we use it (legal bases)", body: ["To provide the Service you signed up for (contract). To bill subscriptions and meet tax duties (contract, legal obligation). To keep the Service secure and prevent abuse (legitimate interests). To send optional product tips only if you opt in (consent)."] },
        { heading: "AI processing", body: ["When you ask for an AI draft, the relevant text is sent to our AI model provider [name the provider] to generate the result. [Confirm the provider does not train on your data and list where it processes data.]"] },
        { heading: "Processors", body: ["Hosting (Vercel), database (Neon), payments (Stripe), email delivery (Resend or your SMTP provider), AI model provider. [Keep this list current and link each provider's DPA.]"] },
        { heading: "International transfers", body: ["Data may be processed outside your country. Where required we rely on Standard Contractual Clauses or equivalent safeguards."] },
        { heading: "Retention", body: ["We keep your data while your account is open. When you delete your account, your data is deleted from the live database immediately and from backups within [30] days. Billing records are kept as long as tax law requires."] },
        { heading: "Your rights (GDPR, UK GDPR, CCPA/CPRA)", body: ["You can access and export your data (Settings → Download my data), correct it, and delete your account (Settings → Delete account). You can object to or restrict certain processing and complain to your data protection authority. California residents: we do not sell or share personal information for cross-context behavioural advertising, and we will not discriminate against you for using your rights."] },
        { heading: "Cookies", body: ["We use only essential cookies: a session cookie to keep you signed in and security cookies. We do not use advertising cookies. If analytics are added later, we will ask for consent first where required."] },
        { heading: "Children", body: ["The Service is not for children under 16."] },
        { heading: "Changes", body: ["We will post updates here and email you about material changes."] },
      ]}
    />
  );
}
