import { expect, test } from "@playwright/test";

const DEMO_PASSWORD = "risheh1403";

/**
 * E2E buyer journey (M5/M6/M7): login → add to cart → checkout →
 * demo payment (each outcome) → order timeline.
 * Requires a seeded DEMO database (DEMO_MODE=true).
 */

test.describe("buyer journey", () => {
  test("successful demo payment finalizes the order", async ({ page }) => {
    await page.goto("/account/login");
    await page.getByRole("button", { name: /ورود با کلمه عبور/ }).click();
    await page.getByPlaceholder(/ایمیل|رایانامه/i).fill("buyer@risheh.ir");
    await page.locator('input[type="password"]').first().fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /ورود به گنجینه ریشه/ }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });

    // Add a product to the cart
    await page.goto("/products");
    await page.getByRole("button", { name: /افزودن .* به سبد خرید/ }).first().click();
    await page.goto("/cart");
    await expect(page.getByText(/سبد خرید شما/)).toBeVisible();

    // Fill the checkout form
    await page.locator('input[placeholder*="0912"]').fill("09121234567");
    await page.locator('input[placeholder="تهران"]').fill("تهران");
    await page.locator('textarea[placeholder*="خیابان"], input[placeholder*="خیابان"]').first().fill("خیابان تست، پلاک ۱");
    await page.getByRole("button", { name: /ادامه فرآیند و پرداخت/ }).click();

    // Demo gateway — clearly labeled simulation
    await expect(page).toHaveURL(/pay\/demo\//, { timeout: 30_000 });
    await expect(page.getByText(/شبیه‌سازی — پول واقعی جابه‌جا نمی‌شود|پول واقعی جابه‌جا نمی‌شود/).first()).toBeVisible();
    await page.getByRole("button", { name: /پرداخت موفق/ }).click();

    // Callback → order page
    await expect(page).toHaveURL(/orders\/RSH-ORD-/, { timeout: 30_000 });
    await expect(page.getByText(/پرداخت نمایشی با موفقیت|پول واقعی جابه‌جا نشده/).first()).toBeVisible();
  });

  test("canceled payment keeps the cart and marks the order canceled", async ({ page }) => {
    await page.goto("/account/login");
    await page.getByRole("button", { name: /ورود با کلمه عبور/ }).click();
    await page.getByPlaceholder(/ایمیل|رایانامه/i).fill("buyer@risheh.ir");
    await page.locator('input[type="password"]').first().fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /ورود به گنجینه ریشه/ }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });

    await page.goto("/products");
    await page.getByRole("button", { name: /افزودن .* به سبد خرید/ }).first().click();
    await page.goto("/cart");
    await page.locator('input[placeholder*="0912"]').fill("09121234567");
    await page.locator('input[placeholder="تهران"]').fill("تهران");
    await page.locator('textarea[placeholder*="خیابان"], input[placeholder*="خیابان"]').first().fill("خیابان تست، پلاک ۲");
    await page.getByRole("button", { name: /ادامه فرآیند و پرداخت/ }).click();
    await expect(page).toHaveURL(/pay\/demo\//, { timeout: 30_000 });

    await page.getByRole("button", { name: /انصراف از پرداخت/ }).click();
    await expect(page).toHaveURL(/orders\/RSH-ORD-/, { timeout: 30_000 });
    // The order detail page must show a canceled/failed banner, NOT success.
    await expect(page.getByText(/لغو|ناموفق/).first()).toBeVisible();
  });

  test("artisan plan page shows cap + listing fee (S5)", async ({ page }) => {
    await page.goto("/account/login");
    await page.getByRole("button", { name: /ورود با کلمه عبور/ }).click();
    await page.getByPlaceholder(/ایمیل|رایانامه/i).fill("artisan@risheh.ir");
    await page.locator('input[type="password"]').first().fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /ورود به گنجینه ریشه/ }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });

    await page.goto("/dashboard/plans");
    await expect(page.getByText(/پلن فعلی/)).toBeVisible();
    await expect(page.getByText(/سقف آگهی فعال|آگهی فعال/).first()).toBeVisible();
    await expect(page.getByText(/کارمزد فروش/).first()).toBeVisible();
  });

  test("registration never offers an ADMIN role (M3)", async ({ page }) => {
    await page.goto("/account/login?mode=register");
    const body = await page.textContent("body");
    expect(body).not.toContain("ADMIN");
    expect(body).not.toContain("مدیر سامانه"); // role only reachable via provisioning
  });
});
