/**
 * Fixed-window rate limiter.
 * In-memory by default, which is per server instance. On Vercel set
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for a shared limit.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type Limit = { ok: boolean; remaining: number; resetAt: number };

export function memoryLimit(key: string, max: number, windowMs: number, now = Date.now()): Limit {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  return { ok: bucket.count <= max, remaining: Math.max(0, max - bucket.count), resetAt: bucket.resetAt };
}

async function upstashLimit(key: string, max: number, windowMs: number): Promise<Limit | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", windowKey], ["PEXPIRE", windowKey, String(windowMs)]]),
    });
    if (!response.ok) return null;
    const [incr] = (await response.json()) as { result: number }[];
    const resetAt = (Math.floor(Date.now() / windowMs) + 1) * windowMs;
    return { ok: incr.result <= max, remaining: Math.max(0, max - incr.result), resetAt };
  } catch {
    return null;
  }
}

export async function rateLimit(key: string, max: number, windowMs: number): Promise<Limit> {
  return (await upstashLimit(key, max, windowMs)) ?? memoryLimit(key, max, windowMs);
}

export const LIMITS = {
  login: { max: 10, windowMs: 15 * 60_000 },
  register: { max: 5, windowMs: 60 * 60_000 },
  reset: { max: 5, windowMs: 60 * 60_000 },
  ai: { max: 20, windowMs: 60_000 },
  api: { max: 60, windowMs: 60_000 },
} as const;

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
