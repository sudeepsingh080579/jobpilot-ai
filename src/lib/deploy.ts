/** True when the demo desk should be inserted. Accepts SEED_DEMO=1 or true. */
export function shouldSeedDemo(value: string | undefined) {
  const flag = value?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

/** Vercel Blob is used only when a read-write token is configured. */
export function usesBlobStore(token: string | undefined) {
  return Boolean(token?.trim());
}

/**
 * Secure cookies on the hosted site. Local http (Playwright, `npm start`)
 * stays insecure so the session cookie is stored. Vercel is always https.
 */
export function secureCookiesEnabled(env: Record<string, string | undefined>) {
  if ((env.AUTH_URL ?? "").startsWith("https://")) return true;
  return env.VERCEL === "1";
}
