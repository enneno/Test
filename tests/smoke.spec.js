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

test('a foglaláskezelő elutasítja a hiányos és az ismeretlen azonosítót', async ({ page }) => {
    let statusRequestCount = 0;
    await page.route('**/rest/v1/rpc/get_booking_status', async route => {
        statusRequestCount += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '[]'
        });
    });

    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });
    const input = page.locator('#foglalas-azonosito');
    await input.fill('rossz-kod');
    await page.locator('#foglalas-ellenorzes-urlap button[type="submit"]').click();
    await expect(page.locator('#foglalas-ellenorzes-status')).toContainText('teljes, LUMI kezdetű');
    expect(statusRequestCount).toBe(0);

    await input.fill('LUMI-AAAA');
    await page.locator('#foglalas-ellenorzes-urlap button[type="submit"]').click();
    await expect(page.locator('#foglalas-ellenorzes-status')).toContainText('Nem találtam foglalást');
    expect(statusRequestCount).toBe(1);
});

test('a 24 órán belüli foglalás is lemondható és minden szükséges részlete látható', async ({ page }) => {
    const reference = 'LUMI-A7K3';
    await page.route('**/rest/v1/rpc/get_booking_status', async route => {
        expect(route.request().postDataJSON()).toEqual({ p_reference: reference });
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                booking_reference: reference,
                service_name: 'Gél lakk',
                service_price_amount: 6500,
                final_price_amount: 6000,
                service_price_unit: 'Ft',
                service_price_text: '6.500 Ft',
                nail_style: 'Francia köröm',
                starts_at: '2099-08-10T08:00:00+02:00',
                ends_at: '2099-08-10T10:00:00+02:00',
                status: 'confirmed',
                status_label: 'Visszaigazolva',
                coupon_label: 'LUMI10 - 500 Ft kedvezmény',
                can_cancel: true
            }])
        });
    });

    await page.goto('/foglalas/?foglalas=' + reference + '#foglalas-ellenorzes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toBeVisible();
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toContainText('Gél lakk');
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toContainText('6000 Ft');
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toContainText('Francia köröm');
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toContainText('10:00');
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toContainText('LUMI10');
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toContainText('Visszaigazolva');
    await expect(page.locator('.foglalas-lemondas-hatarido')).toContainText('bármikor');
    await expect(page.locator('#foglalas-lemondas-megjegyzes-blokk')).toBeVisible();
    await expect(page.locator('#foglalas-lemondas')).toBeVisible();
});

test('a foglalás lemondható az azonosítóval és megjegyzéssel', async ({ page }) => {
    const reference = 'LUMI-7K3M';
    let statusRequestCount = 0;
    await page.route('**/rest/v1/rpc/get_booking_status', async route => {
        statusRequestCount += 1;
        const cancelled = statusRequestCount > 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                booking_reference: reference,
                service_name: 'Erősített gél lakk',
                starts_at: '2099-09-15T09:00:00+02:00',
                ends_at: '2099-09-15T11:00:00+02:00',
                status: cancelled ? 'cancelled_by_customer' : 'confirmed',
                status_label: cancelled ? 'Általad lemondva' : 'Visszaigazolva',
                can_cancel: !cancelled,
                cancel_deadline: '2099-09-14T09:00:00+02:00'
            }])
        });
    });
    await page.route('**/rest/v1/rpc/cancel_booking_by_reference', async route => {
        expect(route.request().postDataJSON()).toEqual({
            p_reference: reference,
            p_note: 'Betegség miatt.'
        });
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{
                success: true,
                result: 'cancelled',
                message: 'A foglalást sikeresen lemondtad.'
            }])
        });
    });

    await page.goto('/foglalas/?foglalas=' + reference + '#foglalas-ellenorzes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#foglalas-lemondas')).toBeVisible();
    await expect(page.locator('#foglalas-lemondas-megjegyzes')).toBeVisible();
    await page.locator('#foglalas-lemondas-megjegyzes').fill('Betegség miatt.');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#foglalas-lemondas').click();
    await expect(page.locator('#foglalas-ellenorzes-eredmeny')).toContainText('Általad lemondva');
    await expect(page.locator('#foglalas-ellenorzes-status')).toContainText('sikeresen lemondtad');
    await expect(page.locator('#foglalas-lemondas')).toBeHidden();
    expect(statusRequestCount).toBe(2);
});

test('a foglaláskezelő asztali és mobil nézetben is rendezett marad', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });

    const manageCard = page.locator('[data-booking-path="manage"]');
    const section = page.locator('#foglalas-ellenorzes');
    const desktopManageLink = page.locator('header .foglalas-kezelo-nav');
    const mobileManageLink = page.locator('#mobil-nav .foglalas-kezelo-nav');
    const desktopBookingLink = page.locator('header .menu-pontok a[href="/foglalas/"]');
    const mobileBookingLink = page.locator('#mobil-nav a[href="/foglalas/"]');
    await expect(desktopManageLink).toHaveAttribute('href', '/foglalas/#foglalas-ellenorzes');
    await expect(mobileManageLink).toHaveAttribute('href', '/foglalas/#foglalas-ellenorzes');
    await expect(desktopBookingLink).toHaveText('Foglalás');
    await expect(mobileBookingLink).toHaveText('Foglalás');
    expect(await desktopBookingLink.evaluate(elem => elem === elem.parentElement.lastElementChild)).toBe(true);
    expect(await mobileBookingLink.evaluate(elem => elem === elem.parentElement.lastElementChild)).toBe(true);
    expect(await page.evaluate(() =>
        Boolean(document.getElementById('online-foglalas').compareDocumentPosition(document.getElementById('foglalas-ellenorzes')) & Node.DOCUMENT_POSITION_FOLLOWING)
    )).toBe(true);
    await expect(manageCard).toBeVisible();
    await manageCard.click();
    await expect(page).toHaveURL(/#foglalas-ellenorzes$/);
    await expect(section).toBeVisible();

    const desktopColumns = await section.evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
    );
    expect(desktopColumns).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileColumns = await section.evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
    );
    const inputBox = await page.locator('#foglalas-azonosito').boundingBox();
    const buttonBox = await page.locator('#foglalas-ellenorzes-urlap button[type="submit"]').boundingBox();
    const sectionBox = await section.boundingBox();

    expect(mobileColumns).toBe(1);
    expect(buttonBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height - 1);
    expect(sectionBox.x).toBeGreaterThanOrEqual(0);
    expect(sectionBox.x + sectionBox.width).toBeLessThanOrEqual(391);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('a foglaláskezelő új szövegei szerkeszthetők és a tesztemailekben látszik a kezelési link', async ({ page }) => {
    const cms = fs.readFileSync(path.resolve(__dirname, '..', 'admin-content.js'), 'utf8');
    const previews = fs.readFileSync(
        path.resolve(__dirname, '..', 'supabase', 'functions', 'send-email-previews', 'index.ts'),
        'utf8'
    );
    const sql = fs.readFileSync(path.resolve(__dirname, '..', 'supabase-booking-self-service.sql'), 'utf8');
    const adminEvents = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'admin', '10-bookings-events.js'), 'utf8');

    expect(cms).toContain("field('navigacio.foglalasom'");
    expect(cms).toContain("field('foglalas.oldal.utak.kezeles.cim'");
    expect(cms).toContain("field('foglalas.oldal.kezeles.kodSegitseg'");
    expect(cms).toContain("field('foglalas.oldal.kezeles.lemondasMegjegyzesPlaceholder'");
    expect(cms).toContain("field('foglalas.popup.azonositoLeiras'");
    expect(previews).toContain('const bookingReference = "LUMI-7K3M"');
    expect(previews).toContain('actionUrl: bookingManageUrl');
    expect(previews).toContain('actionLabel: "Foglalás ellenőrzése vagy lemondása"');

    expect(sql).toContain("set status = 'cancelled_by_customer'");
    expect(sql).toContain("'customer_cancelled'");
    expect(adminEvents).toContain("customer_cancelled: 'A vendég mondta le'");
    expect(adminEvents).toContain("modositas.status === 'cancelled_by_customer'");
    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toHaveClass(/tartalom-toltes/);
    await page.evaluate(() => {
        const foglalas = window.lumiAlapOldalAdatok().foglalas;
        foglalas.oldal.utak.kezeles.cim = 'Teszt kezelőkártya';
        foglalas.oldal.kezeles.cim = 'Teszt ellenőrző cím';
        foglalas.oldal.kezeles.kodCimke = 'Teszt azonosító címke';
        foglalas.oldal.kezeles.lemondasMegjegyzesPlaceholder = 'Teszt lemondási megjegyzés';
        foglalas.popup.azonositoCimke = 'Teszt popup azonosító';
        window.foglalasAdatokAlkalmazasa(foglalas, {});
    });

    await expect(page.locator('[data-booking-path="manage"] .foglalas-ut-cim')).toHaveText('Teszt kezelőkártya');
    await expect(page.locator('#foglalas-ellenorzes-cim')).toHaveText('Teszt ellenőrző cím');
    await expect(page.locator('label[for="foglalas-azonosito"]')).toHaveText('Teszt azonosító címke');
    await expect(page.locator('#foglalas-lemondas-megjegyzes')).toHaveAttribute(
        'placeholder',
        'Teszt lemondási megjegyzés'
    );
    await expect(page.locator('#foglalas-popup-azonosito > span')).toHaveText('Teszt popup azonosító');
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

test('az admin külön, mobilon is kezelhető jelzést ad a vendéglemondásokról', async ({ page }) => {
    const adminForras = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'admin', '10-bookings-events.js'), 'utf8');
    expect(adminForras).toContain("event_type: 'customer_cancellation_acknowledged'");
    expect(adminForras).toContain(".neq('event_type', 'customer_cancellation_acknowledged')");
    expect(adminForras).toContain("allapot.foglalasStatuszSzuro = 'cancelled_by_customer'");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        document.getElementById('admin-bejelentkezes-panel').hidden = true;
        document.getElementById('admin-tartalom').hidden = false;
        const jelzes = document.getElementById('admin-vendeg-lemondas-jelzes');
        jelzes.hidden = false;
        document.getElementById('admin-vendeg-lemondas-darab').textContent = '2';
    });

    const jelzes = page.locator('#admin-vendeg-lemondas-jelzes');
    await expect(jelzes).toBeVisible();
    await expect(jelzes).toContainText('2');
    await expect(page.locator('#admin-vendeg-lemondas-megnyitas')).toBeVisible();
    await expect(page.locator('#admin-vendeg-lemondas-tudomasulvetel')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(jelzes).toBeVisible();
    expect(await jelzes.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await expect(page.locator('#admin-vendeg-lemondas-tudomasulvetel')).toBeVisible();
});

test('az új árlista tétel nem ütközik a már meglévő ideiglenes névvel', async () => {
    const szolgaltatasAdmin = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'admin', '20-services.js'), 'utf8');
    expect(szolgaltatasAdmin).toContain('function ujSzolgaltatasNev(szolgaltatasok');
    expect(szolgaltatasAdmin).toContain('while (hasznaltNevek.has');
    expect(szolgaltatasAdmin).toContain('ujTetel.name = ujSzolgaltatasNev()');
    expect(szolgaltatasAdmin).toContain("String(error?.code || '') === '23505'");
    expect(szolgaltatasAdmin).toContain(".select('name')");
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
test('az admin munkafelület asztali és mobil nézetben rendezett marad', async ({ page }) => {
    const adminBundle = fs.readFileSync(path.resolve(__dirname, '..', 'admin-supabase.js'), 'utf8');
    expect(adminBundle).toContain("select('id,public_reference,starts_at')");
    expect(adminBundle).toContain('admin-foglalas-azonosito');
    expect(adminBundle).toContain('admin-foglalas-nev-blokk');
    expect(adminBundle).not.toContain('admin-foglalas-reszlet-szeles admin-foglalas-azonosito');

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        document.getElementById('admin-bejelentkezes-panel').hidden = true;
        document.getElementById('admin-tartalom').hidden = false;
    });

    const workspace = page.locator('.admin-workspace-layout');
    const sidebar = page.locator('.admin-sidebar');
    const main = page.locator('.admin-workspace-main');
    await expect(workspace).toBeVisible();
    await expect(page.locator('#admin-panel-szovegek')).toHaveCount(1);
    await expect(page.locator('.admin-workspace-main #admin-panel-szovegek')).toHaveCount(1);
    await expect(page.locator('#admin-tiltas-statusz')).toHaveCount(0);
    await expect(page.locator('#admin-foglalas-statusz-szuro option[value="cancelled_by_customer"]')).toHaveText('Vendég mondta le');

    await page.locator('#admin-panel-foglalasok').evaluate((panel) => {
        panel.hidden = false;
        panel.insertAdjacentHTML('beforeend', `
            <article data-azonosito-elrendezes-teszt>
                <div class="admin-foglalas-fosor">
                    <div class="admin-foglalas-nev-blokk">
                        <h3>Teszt Vendég</h3>
                        <p class="admin-foglalas-azonosito"><span>Azonosító:</span><code>A2B4</code></p>
                    </div>
                    <p class="admin-foglalas-idopont">2026. aug. 5. 10:00 - 11:00</p>
                </div>
            </article>
        `);
    });
    const azonositoElrendezes = await page.locator('[data-azonosito-elrendezes-teszt] .admin-foglalas-azonosito').evaluate((elem) => {
        const stilus = getComputedStyle(elem);
        const cimkeStilus = getComputedStyle(elem.querySelector('span'));
        const kodStilus = getComputedStyle(elem.querySelector('code'));
        return {
            nevBlokkban: Boolean(elem.closest('.admin-foglalas-nev-blokk')),
            teljesSzelesseg: elem.getBoundingClientRect().width >= elem.parentElement.getBoundingClientRect().width,
            cimkeBetumeret: cimkeStilus.fontSize,
            kodBetumeret: kodStilus.fontSize,
            keret: stilus.borderTopWidth,
            hatter: stilus.backgroundColor
        };
    });
    expect(azonositoElrendezes).toEqual({
        nevBlokkban: true,
        teljesSzelesseg: false,
        cimkeBetumeret: '8px',
        kodBetumeret: '9px',
        keret: '0px',
        hatter: 'rgba(0, 0, 0, 0)'
    });

    const desktopSidebar = await sidebar.boundingBox();
    const desktopMain = await main.boundingBox();
    expect(desktopSidebar.x + desktopSidebar.width).toBeLessThanOrEqual(desktopMain.x + 1);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileSidebar = await sidebar.boundingBox();
    const mobileMain = await main.boundingBox();
    expect(mobileMain.y).toBeGreaterThanOrEqual(mobileSidebar.y + mobileSidebar.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.locator('[data-admin-tab="emailteszt"]').click();
    await expect(page.locator('#admin-panel-emailteszt')).toBeVisible();
    await expect(page.locator('#admin-email-teszt-kuldes')).toBeVisible();
    await expect(page.locator('#admin-lebego-mentes')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
