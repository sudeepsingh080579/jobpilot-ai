/**
 * India pricing (spec §3). Amounts are integers in paise so no float drift.
 * ₹1,999 is the final GST-inclusive monthly price. The taxable value and the
 * GST included in it are derived here (base = total / (1 + rate), GST = total − base)
 * and nowhere else.
 */
type Env = Record<string, string | undefined>;

export const PLAN_PRICE_PAISE = 199_900; // ₹1,999.00 total, incl. GST
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

/** Split a GST-inclusive total into taxable value + GST. Total is fixed; GST = total − base so they always add up. */
export function priceBreakdown(totalPaise = PLAN_PRICE_PAISE, rateBps = DEFAULT_GST_RATE_BPS): PriceBreakdown {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) throw new Error("totalPaise must be a non-negative integer");
  const basePaise = Math.round((totalPaise * 10_000) / (10_000 + rateBps));
  return { currency: "INR", basePaise, gstRateBps: rateBps, gstPaise: totalPaise - basePaise, totalPaise };
}

/** "₹1,999" or "₹1,694.07" in Indian digit grouping. */
export function formatInr(paise: number, opts: { decimals?: boolean } = {}) {
  const decimals = opts.decimals ?? paise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(paise / 100);
}
