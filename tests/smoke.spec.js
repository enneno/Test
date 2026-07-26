const { test, expect } = require('playwright/test');
const path = require('node:path');
const fs = require('node:fs');

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

test('a francia és díszített stílus plusz 30 percet jelez', async ({ page }) => {
    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });

    const egyszeru = page.locator('input[name="korom-stilus"][value="Egyszerű / egyszínű köröm"]');
    const francia = page.locator('input[name="korom-stilus"][value="Francia köröm"]');
    const diszites = page.locator('input[name="korom-stilus"][value="Festés / díszítés"]');

    await expect(egyszeru).toHaveAttribute('data-extra-minutes', '0');
    await expect(francia).toHaveAttribute('data-extra-minutes', '30');
    await expect(diszites).toHaveAttribute('data-extra-minutes', '30');
    await expect(francia.locator('xpath=..').locator('.foglalas-stilus-ido')).toHaveText('+30 perc');
    await expect(diszites.locator('xpath=..').locator('.foglalas-stilus-ido')).toHaveText('+30 perc');

    await francia.evaluate(input => {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#foglalas-osszefoglalo')).toContainText('Francia köröm (+30 perc)');
});

test('az admin belépési felülete vagy a hitelesített panel megjelenik', async ({ page }) => {
    const response = await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator('#admin-bejelentkezes-panel, #admin-tartalom').first()).toBeAttached();
    await expect(page.locator('#admin-panel-export')).toHaveCount(0);
    await expect(page.locator('[data-admin-export]')).toHaveCount(2);
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

test('a foglalásexport a kapott látható sorokat írja egy formázott munkalapra', async ({ page }) => {
    await page.setContent('<button type="button" data-admin-export="foglalasok">Excel export</button>');
    await page.evaluate(() => {
        window.LumiAdminExportData = {
            foglalasok: () => [{
                __tipus: 'booking', id: 'booking-1', customer_name: 'Teszt Anna',
                customer_phone: '+36201234567', customer_email: 'anna@example.com',
                starts_at: '2026-07-24T08:00:00+02:00', ends_at: '2026-07-24T10:00:00+02:00',
                created_at: '2026-07-20T10:00:00+02:00', status: 'confirmed', coupon_code: 'LUMI10',
                services: { name: 'Gél lakk', price_text: '6000 Ft' }
            }, {
                __tipus: 'blocked', id: 'blocked-1', reason: 'Instagram - Erika',
                starts_at: '2026-07-25T12:00:00+02:00', ends_at: '2026-07-25T13:30:00+02:00',
                created_at: '2026-07-20T11:00:00+02:00'
            }],
            esemenyek: () => []
        };
    });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', 'admin-export.js') });
    await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-admin-export="foglalasok"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^luminails-foglalasok-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const bytes = fs.readFileSync(await download.path());
    expect(bytes.subarray(0, 4).toString('hex')).toBe('504b0304');
    const eocd = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    expect(eocd).toBeGreaterThan(0);
    expect(bytes.readUInt16LE(eocd + 10)).toBe(8);
    const raw = bytes.toString('utf8');
    expect(raw).toContain('Foglalások');
    expect(raw).toContain('Teszt Anna');
    expect(raw).toContain('Kézzel hozzáadott');
    expect(raw).not.toContain('Státuszkód');
    expect(raw.indexOf('Azonosító')).toBeGreaterThan(raw.indexOf('Létrehozva'));
    expect(raw).toContain('s="2"');
});

test('az eseménynapló exportja külön, egyetlen munkalapot készít', async ({ page }) => {
    await page.setContent('<button type="button" data-admin-export="esemenyek">Excel export</button>');
    await page.evaluate(() => {
        window.LumiAdminExportData = {
            foglalasok: () => [],
            esemenyek: () => [{
                id: 'event-1', booking_id: 'booking-1', event_type: 'booking_created', channel: 'web',
                status: 'success', title: 'Foglalás rögzítve', message: 'Teszt esemény',
                metadata: { source: 'test' }, created_at: '2026-07-20T10:00:01+02:00',
                bookings: { customer_name: 'Teszt Anna', starts_at: '2026-07-24T08:00:00+02:00' }
            }]
        };
    });
    await page.addScriptTag({ path: path.resolve(__dirname, '..', 'admin-export.js') });
    await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-admin-export="esemenyek"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^luminails-esemenynaplo-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const bytes = fs.readFileSync(await download.path());
    const raw = bytes.toString('utf8');
    expect(raw).toContain('Eseménynapló');
    expect(raw).toContain('Foglalás rögzítve');
    expect(raw).not.toContain('Foglalások');
});