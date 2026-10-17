import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { PageHeader } from "@/components/shell";
import { CopyVpa, UtrForm } from "@/components/upi-checkout";
import { formatInr, gstRateBps, priceBreakdown } from "@/lib/billing/pricing";
import { newPaymentRef, upiConfig, upiUri } from "@/lib/billing/upi";
import { prisma } from "@/lib/prisma";
import { getEntitlement } from "@/server/billing";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Pay with UPI" };
export const dynamic = "force-dynamic";

export default async function UpiCheckoutPage() {
  const user = await requireUser();
  const cfg = upiConfig();
  const price = priceBreakdown(undefined, gstRateBps());
  const [last, ent] = await Promise.all([
    prisma.upiPayment.findFirst({ where: { userId: user.id, status: "auto_activated" }, orderBy: { createdAt: "desc" } }),
    getEntitlement(user),
  ]);

  if (!cfg.configured) {
    return (
      <div className="max-w-2xl space-y-4">
        <PageHeader eyebrow="Billing" title="Pay with UPI" />
        <p className="rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold">UPI payments are not set up on this server yet.</p>
      </div>
    );
  }

  const ref = newPaymentRef();
  const uri = upiUri({ vpa: cfg.vpa, payeeName: cfg.payeeName, ref, amountPaise: price.totalPaise });
  const qr = await QRCode.toString(uri, { type: "svg", margin: 1, width: 240, errorCorrectionLevel: "M" });

  return (
    <div className="max-w-2xl space-y-5" data-testid="upi-checkout">
      <PageHeader eyebrow="Billing" title="Pay with UPI" />
      {ent.plan === "pro" ? (
        <div className="desk-card space-y-1 p-5" data-testid="upi-active">
          <p className="text-lg font-bold">Pro is active</p>
          <p className="text-sm text-muted">
            {ent.currentPeriodEnd ? `Your Pro access runs until ${ent.currentPeriodEnd.toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST. ` : ""}
            You can pay again for another 30 days after it ends.{last ? ` Last payment: UTR ${last.utr}, ref ${last.ref}.` : ""}
          </p>
          <Link href="/settings/billing" className="text-sm font-semibold underline">Back to billing</Link>
        </div>
      ) : (
        <>
          <div className="desk-card space-y-2 p-5">
            <p className="text-3xl font-bold" data-testid="upi-amount">{formatInr(price.totalPaise)}</p>
            <p className="text-sm text-muted">Pro, 30 days · incl. {price.gstRateBps / 100}% GST ({formatInr(price.basePaise, { decimals: true })} + GST {formatInr(price.gstPaise, { decimals: true })})</p>
            <p className="text-sm text-muted">Payment reference: <strong data-testid="upi-ref">{ref}</strong> (already in the UPI note)</p>
          </div>
          <div className="desk-card grid gap-5 p-5 sm:grid-cols-[auto,1fr]">
            <div className="mx-auto w-60 rounded-xl bg-white p-2" data-testid="upi-qr" aria-label="UPI QR code" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="space-y-3 text-sm">
              <p className="font-semibold">1. Scan with any UPI app (GPay, PhonePe, Paytm, BHIM…) and pay {formatInr(price.totalPaise)}.</p>
              <p className="flex flex-wrap items-center gap-2">UPI ID: <code className="rounded bg-ink/5 px-2 py-1" data-testid="upi-vpa">{cfg.vpa}</code><CopyVpa vpa={cfg.vpa} /></p>
              <p>Payee: {cfg.payeeName}</p>
              <a href={uri} data-testid="upi-open-app" className="inline-flex h-11 items-center rounded-full bg-sun px-5 font-bold text-ink md:hidden">Open UPI app</a>
              <details>
                <summary className="cursor-pointer text-muted">QR not scanning? Use the static QR</summary>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/upi-qr.png" alt={`Static UPI QR for ${cfg.vpa}`} className="mt-2 w-60 rounded-xl" />
                <p className="mt-1 text-xs text-muted">With the static QR, enter {formatInr(price.totalPaise)} yourself and add {ref} in the note.</p>
              </details>
            </div>
          </div>
          <div className="desk-card space-y-3 p-5">
            <p className="font-semibold">2. After paying, enter the 12-digit UTR (UPI transaction / reference ID) from your app. Pro activates instantly.</p>
            <UtrForm paymentRef={ref} />
            <p className="text-xs text-muted">Pro is activated instantly for 30 days when you submit a valid UTR. We check every payment against our UPI account and may revoke access if the payment was not received. Plans do not renew automatically.</p>
          </div>
        </>
      )}
    </div>
  );
}
