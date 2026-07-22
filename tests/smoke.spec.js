const { test, expect } = require('playwright/test');
const path = require('node:path');

const publicPages = ['/', '/arlista/', '/galeria/', '/foglalas/', '/adatkezeles/'];

test('a publikus oldalak betöltődnek JavaScript oldalhiba nélkül', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    for (const path of publicPages) {
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response, path + ' nem adott választ').not.toBeNull();
        expect(response.status(), path + ' HTTP státusz').toBeLessThan(400);
        await expect(page.locator('body')).toBeVisible();
    }

    expect(pageErrors).toEqual([]);
});

test('a foglalás üres beküldése helyben jelez és nem indít adatbázis-írást', async ({ page }) => {
    let writeRequest = false;
    await page.route('**/functions/v1/create-booking-with-email', route => {
        writeRequest = true;
        return route.abort();
    });
    await page.route('**/rest/v1/rpc/create_booking', route => {
        writeRequest = true;
        return route.abort();
    });

    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#foglalas-urlap')).toBeVisible();
    await expect(page.locator('#foglalas-kuldes')).toBeVisible();
    await page.locator('#foglalas-kuldes').click();
    await expect(page.locator('#foglalas-status')).not.toHaveText('');
    expect(writeRequest).toBe(false);
});

test('az admin belépési felülete vagy a hitelesített panel megjelenik', async ({ page }) => {
    const response = await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator('#admin-bejelentkezes-panel, #admin-tartalom').first()).toBeAttached();
});

test('az inspirációs képnéző fejléce görgetéskor rögzítve marad', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const figures = Array.from({ length: 8 }, (_, index) =>
        '<figure><div style="height:420px;background:#eee"></div><figcaption>' +
        (index + 1) + '. kép</figcaption></figure>'
    ).join('');

    await page.setContent(
        '<div class="admin-inspiracio-modal">' +
        '<div class="admin-inspiracio-modal-doboz">' +
        '<div class="admin-inspiracio-modal-fejlec">' +
        '<h3>Inspirációs képek</h3>' +
        '<button class="admin-inspiracio-bezaras">×</button>' +
        '</div>' +
        '<div class="admin-inspiracio-modal-racs">' + figures + '</div>' +
        '</div>' +
        '</div>'
    );
    await page.addStyleTag({ path: path.resolve(__dirname, '..', 'style.css') });
    await page.waitForTimeout(100);

    const header = page.locator('.admin-inspiracio-modal-fejlec');
    const grid = page.locator('.admin-inspiracio-modal-racs');
    const before = await header.boundingBox();
    await grid.evaluate(element => { element.scrollTop = 800; });
    const after = await header.boundingBox();

    expect(await grid.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    await expect(page.locator('.admin-inspiracio-bezaras')).toBeVisible();
});

test('a footer mobilon kompakt és asztali nézetben vízszintes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.site-footer')).toBeVisible();
    const mobileHeight = await page.locator('.footer-belso').evaluate(element => element.getBoundingClientRect().height);
    expect(mobileHeight).toBeLessThan(260);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const columns = await page.locator('.footer-belso').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(3);
});
