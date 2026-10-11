/** Security headers applied to every response (see next.config.ts). */
export function securityHeaders(isDev = process.env.NODE_ENV !== "production") {
  const csp = [
    "default-src 'self'",
    // Next.js injects inline bootstrap scripts; dev also needs eval for HMR.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://api.stripe.com${isDev ? " ws: wss:" : ""}`,
    "frame-src https://js.stripe.com https://checkout.stripe.com https://billing.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(self \"https://checkout.stripe.com\")" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
