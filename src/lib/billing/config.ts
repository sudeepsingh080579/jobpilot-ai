import type { PaidPlan } from "@/lib/billing/plans";

type Env = Record<string, string | undefined>;

/** Stripe is "configured" only when the secret key and both price ids exist. */
export function stripeConfig(env: Env = process.env) {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() || "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
  const prices: Record<PaidPlan, string> = {
    pro_monthly: env.STRIPE_PRICE_MONTHLY?.trim() || "",
    pro_annual: env.STRIPE_PRICE_YEARLY?.trim() || "",
  };
  return {
    secretKey,
    webhookSecret,
    publishableKey,
    prices,
    configured: Boolean(secretKey && prices.pro_monthly && prices.pro_annual),
    webhookConfigured: Boolean(secretKey && webhookSecret),
  };
}

export function planForPrice(priceId: string | null | undefined, env: Env = process.env): PaidPlan | "" {
  if (!priceId) return "";
  const { prices } = stripeConfig(env);
  if (priceId === prices.pro_monthly) return "pro_monthly";
  if (priceId === prices.pro_annual) return "pro_annual";
  return "";
}

/** Public base URL for redirects. */
export function appUrl(env: Env = process.env) {
  const raw = env.APP_URL || env.AUTH_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "") || "http://127.0.0.1:41731";
  return raw.replace(/\/$/, "");
}
