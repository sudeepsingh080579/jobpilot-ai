import { contactText, legalConfig } from "@/lib/legal";
import type { LegalSection } from "@/components/marketing/legal-page";

export function termsSections(): LegalSection[] {
  const c = legalConfig();
  const contact = contactText(c.supportEmail);
  return [
    { heading: "1. Agreement", body: [`These Terms are an agreement between you and ${c.entity} ("we") for use of JobPilot AI (the "Service"). By creating an account you accept them.`] },
    { heading: "2. Accounts", body: ["You must be at least 18 years old to create an account. Keep your password safe; you are responsible for activity on your account. Tell us promptly about any unauthorised use."] },
    { heading: "3. Free trial", body: ["New accounts get a 7-day Pro trial without a payment method. When it ends the account moves to the Free plan. You are never charged unless you choose to subscribe."] },
    { heading: "4. Subscription and billing", body: ["Pro is a monthly plan priced at ₹1,999 per month, inclusive of 18% GST. It is billed in Indian Rupees. Payment is made by UPI: you pay the shown amount to our UPI ID by QR code or UPI app and submit the 12-digit UTR (transaction reference). We verify each payment manually, typically within 24 hours, and a 30-day Pro period starts when the payment is approved. UPI payments do not renew automatically; you pay again to continue. You can cancel at any time in Settings → Billing; Pro access continues until the end of the period you have paid for. We will give at least 30 days' notice of any price change before your next renewal."] },
    { heading: "5. AI output", body: ["The Service uses AI to draft text. Output may be inaccurate or incomplete. Review everything before you use or send it. We never send messages or apply to jobs on your behalf."] },
    { heading: "6. Acceptable use", body: ["Do not use the Service unlawfully, attempt to break its security or usage limits, scrape it, or upload content that infringes others' rights."] },
    { heading: "7. Your content", body: ["You own the content you upload, such as resumes. You allow us to store and process it only to provide the Service. You can export it or delete your account at any time from Settings."] },
    { heading: "8. Availability", body: ["We aim for high availability but do not guarantee the Service will be uninterrupted. We may change or discontinue features with reasonable notice."] },
    { heading: "9. Disclaimers and liability", body: ["The Service is provided \"as is\". We do not guarantee interviews, offers or any job outcome. To the extent permitted by law, our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing here limits rights you have under the Consumer Protection Act, 2019 or other law that cannot be excluded."] },
    { heading: "10. Termination", body: ["You can delete your account at any time from Settings. We may suspend accounts that breach these Terms."] },
    { heading: "11. Governing law and disputes", body: [`These Terms are governed by the laws of India. Subject to your statutory rights as a consumer, the courts at ${c.jurisdiction === "India" ? "the place of our registered office in India" : `${c.jurisdiction}, India`} have jurisdiction.`] },
    { heading: "12. Contact", body: [`Questions about these Terms: ${contact}.`] },
  ];
}

export function privacySections(): LegalSection[] {
  const c = legalConfig();
  const contact = contactText(c.supportEmail);
  const ai = c.aiLive
    ? `When you request an AI draft, the relevant text (for example parts of your resume and a job description) is sent to our AI model provider${c.aiProvider ? `, ${c.aiProvider},` : ""} to generate the result.`
    : "AI drafting currently runs in a built-in mode on our own servers; your text is not sent to any external AI provider. If we connect an external AI provider, we will name it here before your data is sent to it.";
  const grievance = c.grievanceName || c.grievanceEmail
    ? `Grievance Officer: ${[c.grievanceName, c.grievanceEmail].filter(Boolean).join(", ")}.`
    : "You can reach our Grievance Officer through the Support page (/support).";
  return [
    { heading: "Who we are", body: [`${c.entity} is the Data Fiduciary for personal data processed in JobPilot AI, under India's Digital Personal Data Protection Act, 2023 (DPDP Act). Contact: ${contact}.`] },
    { heading: "What we collect", body: ["Account data: name, email and a hashed password. Job-search content you add: resumes (the file and its text), job preferences such as target roles, cities, experience, CTC and notice period, tracked jobs, notes, contacts you enter and drafts. Billing data: plan and subscription status, and for UPI payments the UTR (transaction reference), amount and verification status you submit; we never see your UPI PIN or bank details. Technical data: IP address for security and rate limiting, and essential cookies."] },
    { heading: "Consent and purpose", body: ["We process your personal data on the basis of the consent you give when you create an account, and only to provide the Service: matching and organising your job search, generating drafts you ask for, billing, and keeping the Service secure. Optional emails such as product tips are sent only if you opt in separately. You can withdraw consent at any time by deleting your account; this does not affect processing done before withdrawal."] },
    { heading: "Where your data is stored", body: ["The application is hosted on Vercel. Your account data, job-search content and uploaded resume files are stored in a PostgreSQL database run by Neon in the United States (AWS us-east-1 region). Resume files are private: only you can download them while signed in."] },
    { heading: "AI processing", body: [ai] },
    { heading: "Service providers", body: ["Vercel (hosting), Neon (database), your UPI payment app and bank (to process UPI payments you make), and an email delivery provider for account emails such as verification and password reset. They process data only on our instructions to run the Service. We do not sell your personal data."] },
    { heading: "Retention", body: [`We keep your data while your account is open. When you delete your account, it is deleted from the live database immediately${c.backupDays ? ` and is removed from backups within ${c.backupDays} days` : "; copies in our database provider's point-in-time backups expire automatically under that provider's retention window"}. Payment and tax records are kept for as long as Indian law requires.`] },
    { heading: "Your rights", body: ["Under the DPDP Act you can: access a summary of your data (Settings → Download my data); correct or update it (edit your profile, preferences and resumes in the app); erase it (Settings → Delete account); nominate another person to exercise your rights in case of death or incapacity; and raise a grievance with us. If you are not satisfied with our response, you can complain to the Data Protection Board of India."] },
    { heading: "Grievance Officer", body: [`${grievance} We aim to acknowledge grievances promptly and resolve them within the time required by law.`] },
    { heading: "Cookies", body: ["We use only essential cookies: a session cookie to keep you signed in, and security cookies. We do not use advertising cookies."] },
    { heading: "Children", body: ["The Service is not intended for anyone under 18, and we do not knowingly process children's data."] },
    { heading: "Changes", body: ["We will post updates on this page and change the effective date above."] },
  ];
}

export function refundSections(): LegalSection[] {
  const c = legalConfig();
  const contact = contactText(c.supportEmail);
  return [
    { heading: "Free trial first", body: ["Every account gets 7 days of Pro without a card, so you can decide before you pay. Nothing is charged when the trial ends."] },
    { heading: "Monthly plan", body: ["Pro costs ₹1,999 for 30 days, inclusive of 18% GST. There is no annual plan. Payment is by UPI and is verified manually, typically within 24 hours of you submitting the UTR. Nothing renews automatically. You can cancel at any time; you keep Pro until the end of the period you have paid for."] },
    { heading: "Partial months", body: ["Payments already made are not refunded for unused days of a month, except where a refund is required by law or the charge was an error."] },
    { heading: "Unverified or rejected payments", body: ["If we cannot match a UPI payment to your UTR, we will mark it rejected and tell you why. If money reached us but the payment was rejected, contact us with the UTR and we will either activate Pro or refund it to the paying UPI account."] },
    { heading: "Billing errors", body: ["If you paid twice or paid the wrong amount, contact us with the UTR and we will refund the incorrect amount to the original UPI account."] },
    { heading: "How to contact us", body: [`Reach us at ${contact} from your account email with the date and amount of the charge.`] },
  ];
}
