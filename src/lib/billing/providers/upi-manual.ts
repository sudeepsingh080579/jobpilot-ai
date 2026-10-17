import { upiConfig } from "@/lib/billing/upi";
import type { BillingProvider } from "@/lib/billing/providers/types";
import { BillingNotConfiguredError } from "@/lib/billing/providers/types";

type Env = Record<string, string | undefined>;

/**
 * Manual UPI: the user pays by QR, submits the UTR, an admin verifies it.
 * No webhooks and no recurring mandate, so cancel is local-only (no renewal).
 */
export function createUpiManualProvider(env: Env = process.env): BillingProvider {
  return {
    id: "upi_manual",
    configured: () => upiConfig(env).configured,
    async createCheckout() {
      if (!upiConfig(env).configured) throw new BillingNotConfiguredError("upi_manual");
      return { kind: "upi_page", url: "/settings/billing/upi" };
    },
    async cancel() {},
    verifyWebhook: () => false,
    parseWebhook: () => {
      throw new Error("upi_manual has no webhooks");
    },
  };
}
