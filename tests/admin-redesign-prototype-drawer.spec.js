const { test, expect } = require('playwright/test');

test('mobile booking drawer uses the full viewport width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8102/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Navigáció megnyitása' }).click();
  await page.getByRole('button', { name: 'Időpontok' }).click();
  await page.locator('.booking-row').first().click();

  await expect.poll(async () => {
    const box = await page.locator('#booking-drawer').boundingBox();
    return box ? Math.round(box.x) : null;
  }).toBe(0);

  const drawerBox = await page.locator('#booking-drawer').boundingBox();
  expect(drawerBox).not.toBeNull();
  expect(drawerBox.width).toBe(390);
  await expect(page.getByRole('button', { name: 'Részletek bezárása' })).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-redesign-booking-mobile.png', fullPage: true });
});
