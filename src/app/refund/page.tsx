import type { Metadata } from "next";
import { LEGAL_CONTACT, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      sections={[
        { heading: "Free trial first", body: ["Every account gets 7 days of Pro without a card, so you can decide before you pay."] },
        { heading: "Monthly plan", body: ["You can cancel any time; you keep Pro until the end of the current month. Monthly payments are generally not refunded for partial months."] },
        { heading: "Annual plan", body: ["If you are not happy, ask for a refund within 14 days of your first annual payment and we will refund it in full. After 14 days you keep access until the end of the year you paid for. [Confirm the window with your lawyer.]"] },
        { heading: "EU and UK consumers", body: ["You have a statutory 14-day right to withdraw from a new subscription. By starting to use Pro immediately you ask us to begin the service during that period; if you withdraw, we may deduct a proportionate amount for the days used. [Adapt to local consumer law.]"] },
        { heading: "Billing errors", body: ["If you were charged in error, contact us and we will put it right."] },
        { heading: "How to ask", body: [`Email ${LEGAL_CONTACT} from your account email with the date of the charge. Approved refunds go back to the original payment method through Stripe, usually within 5–10 business days.`] },
      ]}
    />
  );
}
