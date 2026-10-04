import { expect, test } from "@playwright/test";

import { expectUsablePage } from "./support";

const schoolSlug = process.env.E2E_SCHOOL_SLUG?.trim();

test.describe("authenticated school workflows", () => {
  test.skip(!schoolSlug, "Set E2E_SCHOOL_SLUG for authenticated workflow tests.");

  test("dashboard and attendance workspace load", async ({ page }) => {
    await expectUsablePage(page, `/${schoolSlug}/dashboard`);
    await expect(page).not.toHaveURL(/\/login/);

    await expectUsablePage(page, `/${schoolSlug}/attendance`);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("staff attendance and delivery audit are reachable", async ({ page }) => {
    await expectUsablePage(
      page,
      `/${schoolSlug}/staff-operations`,
      "Staff attendance & payroll",
    );
    await expectUsablePage(page, `/${schoolSlug}/whatsapp`, "WhatsApp delivery");
    await expect(page.getByText(/Automatic alert history/i)).toBeVisible();
  });

  for (const workflow of [
    { path: "student-health", heading: "Student health & emergency records" },
    { path: "student-pickup", heading: "Authorized student pickup" },
    { path: "library", heading: "Library management" },
    { path: "transport", heading: "Transport management" },
  ]) {
    test(`${workflow.path} exposes the academic student filters`, async ({ page }) => {
      await expectUsablePage(
        page,
        `/${schoolSlug}/${workflow.path}`,
        workflow.heading,
      );
      // Library and Transport place their student controls inside a secondary
      // tab; activate that tab before asserting its filters are available.
      if (workflow.path === "library") {
        await page.getByRole("tab", { name: /Issue & return/i }).click();
      }
      if (workflow.path === "transport") {
        await page.getByRole("tab", { name: /Student assignments/i }).click();
      }
      await expect(page.getByLabel("Syllabus").first()).toBeVisible();
      await expect(page.getByLabel("Branch").first()).toBeVisible();
      await expect(page.getByLabel("Class").first()).toBeVisible();
      await expect(page.getByLabel("Section").first()).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Student" }).first()).toBeVisible();
    });
  }

  test("attendance mutation tests require explicit disposable-tenant opt-in", async () => {
    expect(process.env.E2E_ALLOW_ATTENDANCE_MUTATIONS).not.toBe("true");
  });
});
