import { expect, test } from "@playwright/test";

test("demo desk: login, plan, tracker, resume, chat", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill("demo@jobpilot.local");
  await page.getByTestId("login-password").fill("pilot-demo");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("weekly-plan")).toBeVisible();
  await expect(page.getByText("Rehearse the live conversations")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/dashboard.png", fullPage: true });

  await page.goto("/tracker");
  await expect(page.getByTestId("tracker-board")).toBeVisible();
  await expect(page.getByText("Razorpay").first()).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/tracker.png", fullPage: true });

  await page.goto("/resumes");
  await page.getByText("Director resume").click();
  await expect(page.getByTestId("resume-score")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/resume.png", fullPage: true });

  await page.goto("/assistant");
  await page.getByTestId("chat-input").fill("What should I do this week?");
  await page.getByTestId("chat-send").click();
  await expect(page.getByTestId("chat-log").getByText("Next:")).toBeVisible();
  await page.screenshot({ path: "/opt/cursor/artifacts/screenshots/chat.png", fullPage: true });
});
