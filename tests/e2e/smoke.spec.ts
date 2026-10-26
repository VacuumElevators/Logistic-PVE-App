import { test, expect } from "@playwright/test";

/**
 * Walking-skeleton smoke test.
 *
 * Verifies that the application boots, the authentication gate redirects
 * unauthenticated visitors to the login page, the login page renders its form,
 * and protected API routes reject unauthenticated access. It is intentionally
 * read-only: it performs no sign-in and writes no data.
 */

test("unauthenticated visit is redirected to the login page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("the login page renders its sign-in form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("a protected API route rejects unauthenticated access", async ({
  request,
}) => {
  const res = await request.get("/api/orders");
  expect(res.status()).toBe(401);
});
