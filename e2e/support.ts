import { expect, type Page } from "@playwright/test";

export function observePageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  return () => expect(errors, "unexpected browser page errors").toEqual([]);
}

export async function expectUsablePage(
  page: Page,
  path: string,
  heading?: string | RegExp,
) {
  const assertNoPageErrors = observePageErrors(page);
  // A committed document is enough to start the user-facing assertions below.
  // Waiting for DOMContentLoaded can be held open by Clerk or another external
  // dependency even though the SchoolDB page is already rendered and usable.
  const response = await page.goto(path, { waitUntil: "commit" });

  expect(response, `no document response for ${path}`).not.toBeNull();
  expect(response!.status(), `server error while loading ${path}`).toBeLessThan(500);
  await expect(page.locator("body")).not.toHaveText("");
  await expect(
    page.locator(
      '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
    ),
  ).toHaveCount(0);

  if (heading) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  assertNoPageErrors();
}
