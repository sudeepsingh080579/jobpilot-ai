// Creates the JobPilot AI Pro product and both prices in YOUR Stripe account,
// then prints the price ids to paste into STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY.
// Safe to re-run: it reuses prices that carry the same lookup_key.
//
//   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
//
// Run it once with a test key, then again with the live key.
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first (Stripe Dashboard → Developers → API keys).");
  process.exit(1);
}
const stripe = new Stripe(key);
const mode = key.startsWith("sk_live") || key.startsWith("rk_live") ? "LIVE" : "TEST";

const PLANS = [
  { lookup: "jobpilot_pro_monthly", env: "STRIPE_PRICE_MONTHLY", amount: 4000, interval: "month", nickname: "Pro Monthly" },
  { lookup: "jobpilot_pro_annual", env: "STRIPE_PRICE_YEARLY", amount: 40000, interval: "year", nickname: "Pro Annual" },
];

async function findProduct() {
  const list = await stripe.products.search({ query: "metadata['app']:'jobpilot' AND active:'true'" }).catch(() => null);
  return list?.data?.[0] ?? null;
}

const product =
  (await findProduct()) ??
  (await stripe.products.create({
    name: "JobPilot AI Pro",
    description: "Full access to the JobPilot AI job-search copilot.",
    tax_code: "txcd_10103001", // Software as a service (SaaS), business use. Review with your tax advisor.
    metadata: { app: "jobpilot" },
  }));

const existing = await stripe.prices.list({ lookup_keys: PLANS.map((p) => p.lookup), limit: 10 });
const out = {};
for (const plan of PLANS) {
  let price = existing.data.find((p) => p.lookup_key === plan.lookup && p.active);
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: plan.amount,
      recurring: { interval: plan.interval },
      nickname: plan.nickname,
      lookup_key: plan.lookup,
      tax_behavior: "exclusive",
    });
  }
  out[plan.env] = price.id;
}

console.log(`\nStripe ${mode} mode. Product: ${product.id}\n`);
for (const [name, id] of Object.entries(out)) console.log(`${name}=${id}`);
console.log("\nNext: add these to Vercel → Settings → Environment Variables, then create the webhook endpoint (see README).");
