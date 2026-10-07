import { expect, type Page } from "@playwright/test";

export function observePageErrors(page: Page) {
  const errors: string[] = [];
  const onPageError = (error: Error) => errors.push(error.message);
  page.on("pageerror", onPageError);

  return () => {
    page.off("pageerror", onPageError);
    expect(errors, "unexpected browser page errors").toEqual([]);
  };
}

export async function expectUsablePage(
  page: Page,
  path: string,
  heading?: string | RegExp,
) {
  // A committed document is enough to start the user-facing assertions below.
  // Waiting for DOMContentLoaded can be held open by Clerk or another external
  // dependency even though the SchoolDB page is already rendered and usable.
  const response = await page.goto(path, { waitUntil: "commit" });
  // Start observing after the new document commits so WebKit does not report
  // fetches aborted by navigation away from the previous page as page errors.
  const assertNoPageErrors = observePageErrors(page);

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

  // A remote stylesheet can finish shortly after the document commits. Polling
  // prevents recording the unstyled desktop layout as mobile overflow while
  // still failing when the final rendered page genuinely overflows.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      { message: `horizontal overflow on ${path}` },
    )
    .toBeLessThanOrEqual(1);
  assertNoPageErrors();
}
