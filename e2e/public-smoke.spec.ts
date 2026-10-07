import { expect, test } from "@playwright/test";

import { expectUsablePage } from "./support";

test.describe("public and PWA smoke checks", () => {
  test("marketing home renders without browser errors or overflow", async ({ page }) => {
    await expectUsablePage(page, "/", /Your school,/i);
  });

  test("school chooser remains usable on desktop and mobile", async ({ page }) => {
    await expectUsablePage(page, "/choose-school", "Enter your school slug");
    await expect(page.getByRole("textbox")).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("offline fallback renders a recovery action", async ({ page }) => {
    await expectUsablePage(page, "/offline", "You are offline");
    await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
  });

  test("manifest contains installable PWA metadata", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: "SchoolDB School Management",
      short_name: "SchoolDB",
      display: "standalone",
      start_url: "/choose-school",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192" }),
        expect.objectContaining({ sizes: "512x512" }),
      ]),
    );
  });

  test("service worker is available", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain("self.addEventListener");
  });

  test("security policy is enforced", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-security-policy"]).toContain(
      "default-src 'self'",
    );
    expect(response.headers()["content-security-policy-report-only"]).toBeUndefined();
  });

  test("health endpoint confirms the application database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "healthy",
      checks: { database: "up" },
    });
  });
});

test.describe("unauthenticated tenant boundary", () => {
  const schoolSlug = process.env.E2E_SCHOOL_SLUG?.trim();

  test.skip(!schoolSlug, "Set E2E_SCHOOL_SLUG to exercise tenant redirects.");

  test("tenant login page is publicly reachable", async ({ page }) => {
    await expectUsablePage(page, `/${schoolSlug}/login`);
    await expect(page).toHaveURL(new RegExp(`/${schoolSlug}/login`));
  });

  test("protected attendance redirects to tenant login", async ({ page }) => {
    await page.goto(`/${schoolSlug}/attendance`);
    await expect(page).toHaveURL(new RegExp(`/${schoolSlug}/login`));
  });

  test("protected APIs reject an anonymous request", async ({ request }) => {
    const response = await request.get("/api/v1/students", {
      headers: { "x-school-slug": schoolSlug! },
      maxRedirects: 0,
    });
    // Clerk may reject an anonymous API request with a redirect to sign-in
    // before the route handler runs. Treat that as the same protected boundary
    // as an explicit 401/403 (and keep 404 for deployments that omit the route).
    expect([307, 308, 401, 403, 404]).toContain(response.status());
  });
});
