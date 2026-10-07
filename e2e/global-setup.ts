import { chromium, type FullConfig } from "@playwright/test";

export default async function refreshAuthenticatedState(config: FullConfig) {
  if (process.env.E2E_SKIP_AUTH_REFRESH === "true") return;

  const authState = process.env.E2E_AUTH_STATE?.trim();
  const schoolSlug = process.env.E2E_SCHOOL_SLUG?.trim();
  const baseURL = config.projects[0]?.use.baseURL;

  if (!authState || !schoolSlug || typeof baseURL !== "string") return;

  const target = new URL(`/${schoolSlug}/dashboard`, baseURL);
  if (!target.protocol.startsWith("http")) return;

  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      serviceWorkers: "block",
      storageState: authState,
    });
    const page = await context.newPage();
    const response = await page.goto(target.toString(), { waitUntil: "commit" });

    if (!response || response.status() >= 500 || page.url().includes("/login")) {
      throw new Error(
        "The saved E2E authentication state could not be refreshed. Sign in again and regenerate E2E_AUTH_STATE.",
      );
    }

    await page.waitForLoadState("domcontentloaded");
    await context.storageState({ path: authState });
  } finally {
    await browser.close();
  }
}
