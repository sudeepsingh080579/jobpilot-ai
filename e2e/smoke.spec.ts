import { expect, test } from "@playwright/test";

test("guided desk: landing, journey, assistant, tools, tracker", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("landing-headline")).toBeVisible();
  await expect(page.getByTestId("landing-signin")).toBeVisible();
  await expect(page.getByTestId("landing-cta")).toBeVisible();
  await expect(page.getByTestId("pro-price")).toContainText("$400");
  await page.getByTestId("toggle-monthly").click();
  await expect(page.getByTestId("pro-price")).toContainText("$40");
  await page.getByTestId("cookie-ok").click();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/landing.png", fullPage: true });

  await page.getByTestId("landing-signin").click();
  await page.getByTestId("login-email").fill("demo@jobpilot.local");
  await page.getByTestId("login-password").fill("pilot-demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("journey-home")).toBeVisible();
  await expect(page.getByTestId("next-step")).toBeVisible();
  await expect(page.getByTestId("journey-stepper")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/home-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/home-phone.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByTestId("next-step-cta").click();
  await expect(page.getByTestId("step-match")).toBeVisible();
  await expect(page.getByRole("button", { name: "Optimise my resume" })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/journey-step.png", fullPage: true });

  await page.getByTestId("assistant-open").click();
  await expect(page.getByTestId("assistant-panel")).toBeVisible();
  await page.getByTestId("chat-input").fill("What should I do this week?");
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("chat-log").getByText("Next:")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/assistant-panel.png" });

  await page.getByLabel("Close assistant").click();
  await page.goto("/more");
  await expect(page.getByTestId("more-tools")).toBeVisible();
  await expect(page.getByRole("link", { name: /SWOT/ })).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/more-tools.png", fullPage: true });

  await page.goto("/tracker");
  await expect(page.getByTestId("tracker-board")).toBeVisible();
  await expect(page.getByText("Razorpay").first()).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/tracker-bright.png", fullPage: true });

  await page.goto("/settings/billing");
  await expect(page.getByTestId("billing-page")).toBeVisible();
  await expect(page.getByTestId("current-plan")).toContainText(/trial|Pro|Free/i);
  if (!process.env.STRIPE_SECRET_KEY) await expect(page.getByTestId("payments-not-configured")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/billing.png", fullPage: true });
});

test("production manifest stays installable", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(String(manifest.theme_color).toLowerCase()).toBe("#4f46e5");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
});

test("public pages, legal templates and security headers", async ({ page, request }) => {
  for (const path of ["/pricing", "/terms", "/privacy", "/refund"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
  }
  await expect(page.getByTestId("legal-template-notice")).toBeVisible();
  const home = await request.get("/");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  const webhook = await request.post("/api/stripe/webhook", { data: "{}" });
  expect([400, 503]).toContain(webhook.status());
});
