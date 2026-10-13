/**
 * India pricing (spec §3). Amounts are integers in paise so no float drift.
 * ₹2,000 is the plan price before GST; GST is shown separately and the
 * final payable amount is computed here and nowhere else.
 */
type Env = Record<string, string | undefined>;

export const PLAN_PRICE_PAISE = 200_000; // ₹2,000.00
export const DEFAULT_GST_RATE_BPS = 1800; // 18% (SAC 998314/9984xx online services)

export type PriceBreakdown = {
  currency: "INR";
  basePaise: number;
  gstRateBps: number;
  gstPaise: number;
  totalPaise: number;
};

/** GST rate in basis points. GST_RATE_BPS env overrides; invalid values fall back to 18%. */
export function gstRateBps(env: Env = process.env) {
  const raw = Number(env.GST_RATE_BPS);
  return Number.isInteger(raw) && raw >= 0 && raw <= 2800 ? raw : DEFAULT_GST_RATE_BPS;
}

export function priceBreakdown(basePaise = PLAN_PRICE_PAISE, rateBps = DEFAULT_GST_RATE_BPS): PriceBreakdown {
  if (!Number.isInteger(basePaise) || basePaise < 0) throw new Error("basePaise must be a non-negative integer");
  const gstPaise = Math.round((basePaise * rateBps) / 10_000);
  return { currency: "INR", basePaise, gstRateBps: rateBps, gstPaise, totalPaise: basePaise + gstPaise };
}

/** "₹2,000" or "₹2,360.00" in Indian digit grouping. */
export function formatInr(paise: number, opts: { decimals?: boolean } = {}) {
  const decimals = opts.decimals ?? paise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(paise / 100);
}
