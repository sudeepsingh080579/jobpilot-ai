/**
 * Optional error-monitoring hook. Set ERROR_WEBHOOK_URL to receive a JSON POST
 * for each server error (works with Slack/Discord incoming webhooks, a logging
 * endpoint, or a Sentry tunnel you control). Without it, errors go to console.
 */
export async function captureError(error: unknown, context: Record<string, unknown> = {}) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[error]", err.message, context);
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `JobPilot error: ${err.message}`,
        message: err.message,
        stack: err.stack?.split("\n").slice(0, 8).join("\n"),
        context,
        env: process.env.VERCEL_ENV || process.env.NODE_ENV,
        at: new Date().toISOString(),
      }),
    });
  } catch {
    // Monitoring must never break the request.
  }
}
