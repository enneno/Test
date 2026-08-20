const { test, expect } = require('playwright/test');

const prototypeUrl = 'http://127.0.0.1:8102/';

test.describe('Luminails admin redesign – isolated prototype', () => {
  test('desktop workflow and layout', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(prototypeUrl, { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Jó reggelt, Levi' })).toBeVisible();
    await expect(page.getByText('Helyi redesign prototípus')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(4);
    await expect(page.locator('body')).toHaveCSS('font-size', '14px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
    await page.screenshot({ path: 'test-results/admin-redesign-overview-desktop.png', fullPage: true });

    await page.getByRole('button', { name: 'Időpontok' }).click();
    await expect(page.getByRole('heading', { name: 'Időpontok' })).toBeVisible();
    await expect(page.locator('.booking-row')).toHaveCount(4);
    const rowFontSize = await page.locator('.booking-row .booking-primary strong').first().evaluate(node => getComputedStyle(node).fontSize);
    expect(Number.parseFloat(rowFontSize)).toBeLessThanOrEqual(12);

    const search = page.getByPlaceholder('Név, email, telefonszám vagy azonosító');
    await search.fill('Kovács Anna');
    await expect(page.locator('.booking-row')).toHaveCount(1);
    await page.locator('.booking-row').click();
    await expect(page.getByRole('complementary', { name: 'Foglalás részletei' })).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByRole('heading', { name: 'Kovács Anna' })).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-redesign-booking-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Részletek bezárása' }).click();

    await page.getByRole('button', { name: 'Weboldal' }).click();
    await page.getByRole('tab', { name: 'Galéria' }).click();
    await expect(page.locator('.gallery-card')).toHaveCount(6);
    expect(await page.locator('.gallery-card img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBeTruthy();
    await page.screenshot({ path: 'test-results/admin-redesign-gallery-desktop.png', fullPage: true });

    await page.getByRole('button', { name: 'Kommunikáció' }).click();
    await expect(page.getByRole('heading', { name: 'Kommunikáció' })).toBeVisible();
    await expect(page.getByText('Németh Luca emlékeztetője még nem ment ki')).toBeVisible();
    await page.getByRole('button', { name: 'Újrapróbálás most' }).click();
    await expect(page.getByText('Az újrapróbálás elindult')).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });

  test('mobile navigation, booking detail and no horizontal overflow', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(prototypeUrl, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Jó reggelt, Levi' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.getByRole('button', { name: 'Navigáció megnyitása' }).click();
    await expect(page.getByRole('navigation', { name: 'Fő navigáció' })).toBeVisible();
    await page.getByRole('button', { name: 'Időpontok' }).click();
    await expect(page.getByRole('heading', { name: 'Időpontok' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.locator('.booking-row').first().click();
    await expect(page.getByRole('heading', { name: 'Kovács Anna' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: 'test-results/admin-redesign-booking-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Részletek bezárása' }).click();

    await page.getByRole('button', { name: 'Új bejegyzés' }).click();
    await expect(page.getByRole('heading', { name: 'Új foglalás' })).toBeVisible();
    await page.getByRole('button', { name: 'Bezárás' }).click();
    await expect(page.locator('#quick-add-dialog')).not.toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });
});
