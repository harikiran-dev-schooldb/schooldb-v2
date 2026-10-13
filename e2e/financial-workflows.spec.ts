import { expect, test } from "@playwright/test";

import { dismissOptionalPwaPrompts, expectUsablePage } from "./support";

const schoolSlug = process.env.E2E_SCHOOL_SLUG?.trim();

test.describe("critical financial workflows", () => {
  test.skip(!schoolSlug, "Set E2E_SCHOOL_SLUG for authenticated financial tests.");

  test("payment history and Cashfree reconciliation APIs remain reachable", async ({ page, request }) => {
    await expectUsablePage(page, `/${schoolSlug}/fees/payments`, "Payment History");
    await expect(page).not.toHaveURL(/\/login/);

    const history = await request.get("/api/v1/fee-payments", {
      headers: { "x-school-slug": schoolSlug! },
    });
    expect(history.status()).toBeLessThan(500);

    const reconciliation = await request.get(
      `/api/v1/online-payments/cashfree/staff/reconciliation?schoolSlug=${encodeURIComponent(schoolSlug!)}`,
      { headers: { "x-school-slug": schoolSlug! } },
    );
    expect(reconciliation.status()).toBeLessThan(500);
  });

  test("Cashfree payments require confirmation and send a refund request", async ({ page }) => {
    let refundBody: unknown = null;
    await page.route("**/api/v1/fee-payments/installment-options", (route) =>
      route.fulfill({ json: { success: true, data: [] } }),
    );
    await page.route("**/api/v1/fee-payments?**", (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            rows: [{
              id: "payment-e2e",
              receiptNo: "FEE-E2E-001",
              paymentDate: "2026-10-12T00:00:00.000Z",
              amount: 1250,
              paymentMode: "ONLINE",
              referenceNo: "cf-e2e",
              remarks: "Cashfree order SDB-E2E",
              status: "SUCCESS",
              student: { id: "student-e2e", fullName: "Finance Test Student", admissionNo: "E2E-001", class: "V", section: "A" },
              allocationCount: 1,
              cashfree: { orderId: "SDB-E2E", refundStatus: null, refundArn: null, statusDescription: null },
            }],
            summary: { paymentCount: 1, totalAmount: 1250 },
            pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
          },
        },
      }),
    );
    await page.route("**/api/v1/fee-payments/payment-e2e/void", async (route) => {
      refundBody = route.request().postDataJSON();
      await route.fulfill({ json: { success: true, data: { refundStatus: "PENDING" }, message: "Cashfree refund initiated." } });
    });

    await page.goto(`/${schoolSlug}/fees/payments`);
    await dismissOptionalPwaPrompts(page);
    await expect(page.getByText("FEE-E2E-001")).toBeVisible();
    await page.getByRole("button", { name: "Refund" }).click();
    await expect(page.getByRole("heading", { name: "Refund Cashfree Payment" })).toBeVisible();
    await expect(page.getByText(/gateway confirms the refund/i)).toBeVisible();
    await page.getByPlaceholder(/reason for refunding/i).fill("Duplicate online collection");
    await page.getByRole("button", { name: "Request Refund" }).click();
    await expect.poll(() => refundBody).toEqual({ reason: "Duplicate online collection" });
  });

  test("live financial mutations require explicit disposable-tenant opt-in", async () => {
    expect(process.env.E2E_ALLOW_FINANCIAL_MUTATIONS).not.toBe("true");
  });
});
