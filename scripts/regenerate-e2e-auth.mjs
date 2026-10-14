import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { chromium } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL?.trim();
const schoolSlug = process.env.E2E_SCHOOL_SLUG?.trim();
const authState = process.env.E2E_AUTH_STATE?.trim();
const email = process.env.E2E_LOGIN_EMAIL?.trim();

if (!baseUrl || !schoolSlug || !authState || !email) {
  throw new Error(
    "E2E_BASE_URL, E2E_SCHOOL_SLUG, E2E_AUTH_STATE, and E2E_LOGIN_EMAIL are required.",
  );
}

const browser = await chromium.launch({
  headless: process.env.E2E_AUTH_HEADED !== "true",
});
const context = await browser.newContext({ serviceWorkers: "block" });
const page = await context.newPage();

async function openAuthenticatedDashboard() {
  const dashboardUrl = new URL(`/${schoolSlug}/dashboard`, baseUrl).toString();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(dashboardUrl, { waitUntil: "commit" });
    } catch (error) {
      // Successful OTP verification can redirect at the same moment as this
      // navigation. Chromium reports that harmless collision as ERR_ABORTED.
      if (!(error instanceof Error) || !error.message.includes("ERR_ABORTED")) {
        throw error;
      }
    }

    await page.waitForTimeout(750);
    if (!page.url().endsWith("/login")) return;
  }

  throw new Error("SchoolDB rejected the OTP or did not create an authenticated session.");
}

try {
  await page.goto(new URL(`/${schoolSlug}/login`, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Use email OTP instead" }).click();
  await page.getByRole("textbox", { name: "School email ID" }).fill(email);
  await page.getByRole("button", { name: "Send email OTP" }).click();

  const prompt = createInterface({ input: stdin, output: stdout });
  const code = (await prompt.question("Enter the 6-digit SchoolDB OTP: ")).trim();
  prompt.close();

  if (!/^\d{6}$/.test(code)) {
    throw new Error("The SchoolDB OTP must contain exactly 6 digits.");
  }

  await page.locator("input:not([disabled])").last().fill(code);
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await page.waitForTimeout(1_500);
  await openAuthenticatedDashboard();
  await context.storageState({ path: authState });
  console.log(`Saved authenticated Playwright state to ${authState}.`);
} finally {
  await browser.close();
}
