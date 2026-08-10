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

test('a főoldali vendégértesítő adminból kapcsolható és mobilon is rendezett', async ({ page }) => {
    const cms = fs.readFileSync(path.resolve(__dirname, '..', 'admin-content.js'), 'utf8');
    expect(cms).toContain("checkbox('fooldal.ertesito.aktiv'");
    expect(cms).toContain("field('fooldal.ertesito.cimke'");
    expect(cms).toContain("field('fooldal.ertesito.szoveg'");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toHaveClass(/tartalom-toltes/);
    await expect(page.locator('#vendegertesito')).toBeHidden();

    await page.evaluate(() => {
        const adatok = window.lumiAlapOldalAdatok();
        adatok.fooldal.ertesito = {
            aktiv: true,
            cimke: 'Aktuális információ',
            szoveg: 'Kedves Vendégeim!\nAugusztus 20–24. között szabadság miatt nem leszek elérhető.'
        };
        window.fooldalAdatokAlkalmazasa(adatok.fooldal, adatok.galeria);
    });

    const ertesito = page.locator('#vendegertesito');
    await expect(ertesito).toBeVisible();
    await expect(ertesito.locator('.vendegertesito-cimke')).toHaveText('Aktuális információ');
    await expect(ertesito.locator('.vendegertesito-szoveg')).toContainText('Augusztus 20–24.');
    expect(await ertesito.locator('.vendegertesito-szoveg').evaluate(
        (elem) => Number.parseFloat(getComputedStyle(elem).fontSize)
    )).toBe(16);
    const mobilElhelyezes = await page.evaluate(() => {
        const sav = document.getElementById('vendegertesito').getBoundingClientRect();
        const hero = document.getElementById('hero').getBoundingClientRect();
        return {
            savAlja: Math.round(sav.bottom),
            heroTeteje: Math.round(hero.top),
            szelesseg: document.documentElement.scrollWidth
        };
    });
    expect(mobilElhelyezes.heroTeteje).toBeGreaterThanOrEqual(mobilElhelyezes.savAlja);
    expect(mobilElhelyezes.szelesseg).toBeLessThanOrEqual(375);

    await page.setViewportSize({ width: 844, height: 390 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);

    await page.evaluate(() => {
        window.fooldalAdatokAlkalmazasa({
            ertesito: {
                aktiv: false,
                cimke: 'Aktuális információ',
                szoveg: 'Ez az üzenet most ne jelenjen meg.'
            }
        }, {});
    });
    await expect(ertesito).toBeHidden();
});

test('mobilon minden szerkeszthető publikus és admin mező 22 pixeles technikai méretet és optikai korrekciót használ', async ({ page }) => {
    const mezoSelector = [
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
        'select',
        'textarea',
        '[contenteditable="true"]'
    ].join(',');

    await page.setViewportSize({ width: 375, height: 812 });
    for (const utvonal of ['/foglalas/', '/admin/']) {
        await page.goto(utvonal, { waitUntil: 'domcontentloaded' });
        const mezok = await page.locator(mezoSelector).evaluateAll((elemek) => elemek.map((elem) => ({
            azonosito: elem.id || elem.name || elem.type || elem.tagName.toLowerCase(),
            betumeret: Number.parseFloat(getComputedStyle(elem).fontSize),
            optikaiArany: getComputedStyle(elem).fontSizeAdjust
        })));
        expect(mezok.length, utvonal + ' nem tartalmazott ellenőrizhető mezőt').toBeGreaterThan(0);
        expect(
            mezok.filter(({ betumeret }) => betumeret < 22),
            utvonal + ' oldalon 22 px alatti mobilmező maradt'
        ).toEqual([]);
        expect(
            mezok.filter(({ optikaiArany }) => optikaiArany !== '0.4'),
            utvonal + ' oldalon optikai korrekció nélküli mobilmező maradt'
        ).toEqual([]);
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).webkitTextSizeAdjust)).toBe('100%');
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    }
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
    await page.locator('#foglalas-urlap').evaluate(urlap => {
        urlap.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await expect(page.locator('#foglalas-status')).not.toHaveText('');
    expect(writeRequest).toBe(false);
});

test('a teljes oldalas foglalási űrlap minden részt egyben mutat és megőrzi a választásokat', async ({ page }) => {
    await page.route('**/rest/v1/services*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
            ['001', 'Építés - S méret', '7000 Ft', 7000, 150],
            ['002', 'Építés - M méret', '8000 Ft', 8000, 180],
            ['003', 'Építés - L méret', '9000 Ft', 9000, 210],
            ['004', 'Töltés - S méret', '6500 Ft', 6500, 120],
            ['005', 'Töltés - M méret', '7500 Ft', 7500, 150],
            ['006', 'Töltés - L méret', '8500 Ft', 8500, 180],
            ['007', 'Manikűr - Sima manikűr', '2500 Ft', 2500, 60],
            ['008', 'Manikűr - Gél lakk leszedés + manikűr', '3000 Ft', 3000, 60],
            ['009', 'Manikűr - Műköröm leszedés + manikűr', '3500 Ft', 3500, 90],
            ['010', 'Gél lakk - Hagyományos gél lakk', '4500 Ft', 4500, 90],
            ['011', 'Gél lakk - Erősített gél lakk', '5500 Ft', 5500, 120]
        ].map(([id, name, priceText, priceAmount, durationMinutes]) => ({
            id: `00000000-0000-0000-0000-000000000${id}`,
            name,
            description: name,
            price_text: priceText,
            price_amount: priceAmount,
            price_unit: 'Ft',
            price_suffix: '',
            duration_minutes: durationMinutes
        })))
    }));
    await page.route('**/rest/v1/rpc/get_available_dates_for_style', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ work_date: '2099-12-01' }])
    }));
    await page.route('**/rest/v1/rpc/get_available_slots_for_style', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ starts_at: '2099-12-01T10:00:00+01:00', label: '10:00' }])
    }));
    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.foglalas-lepes:visible')).toHaveCount(5);
    await expect(page.locator('#foglalas-lepes-felirat')).toHaveCount(0);
    await expect(page.locator('.foglalas-flow-navigacio')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/foglalas-folyamat-aktiv/);

    await expect(page.locator('#foglalas-szolgatatas option[value]:not([value=""])').first()).toBeAttached();
    const szolgaltatasId = await page.locator('#foglalas-szolgatatas option[value]:not([value=""])').first().getAttribute('value');
    await page.selectOption('#foglalas-szolgatatas', szolgaltatasId);

    await page.locator('input[name="korom-stilus"]').first().evaluate(input => {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('#foglalas-datum-kartyak [data-value="2099-12-01"]')).toBeVisible();
    await page.locator('#foglalas-datum-kartyak [data-value="2099-12-01"]').click();
    await expect(page.locator('#foglalas-ido-kartyak [data-value="2099-12-01T10:00:00+01:00"]')).toBeVisible();
    await page.locator('#foglalas-ido-kartyak [data-value="2099-12-01T10:00:00+01:00"]').click();

    await expect(page.locator('.foglalas-lepes:visible')).toHaveCount(5);
    await expect(page.locator('#foglalas-szolgatatas')).toHaveValue(szolgaltatasId);
    await expect(page.locator('input[name="korom-stilus"]').first()).toBeChecked();
    await expect(page.locator('#foglalas-ido')).toHaveValue('2099-12-01T10:00:00+01:00');
    await expect(page.locator('#foglalas-osszefoglalo')).toContainText('10:00');
});

test('a teljes oldalas foglalási felület asztalon és mobilon is tömör választókat használ', async ({ page }) => {
    await page.route('**/rest/v1/services*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
            ['001', 'Építés - S méret', '7000 Ft', 7000, 150],
            ['002', 'Építés - M méret', '8000 Ft', 8000, 180],
            ['003', 'Építés - L méret', '9000 Ft', 9000, 210],
            ['004', 'Töltés - S méret', '6500 Ft', 6500, 120],
            ['005', 'Töltés - M méret', '7500 Ft', 7500, 150],
            ['006', 'Töltés - L méret', '8500 Ft', 8500, 180],
            ['007', 'Manikűr - Sima manikűr', '2500 Ft', 2500, 60],
            ['008', 'Manikűr - Gél lakk leszedés + manikűr', '3000 Ft', 3000, 60],
            ['009', 'Manikűr - Műköröm leszedés + manikűr', '3500 Ft', 3500, 90],
            ['010', 'Gél lakk - Hagyományos gél lakk', '4500 Ft', 4500, 90],
            ['011', 'Gél lakk - Erősített gél lakk', '5500 Ft', 5500, 120]
        ].map(([id, name, priceText, priceAmount, durationMinutes]) => ({
            id: `00000000-0000-0000-0000-000000000${id}`,
            name,
            description: name,
            price_text: priceText,
            price_amount: priceAmount,
            price_unit: 'Ft',
            price_suffix: '',
            duration_minutes: durationMinutes
        })))
    }));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.foglalas-flow-racs')).toHaveCount(0);
    await expect(page.locator('.foglalas-lepes:visible')).toHaveCount(5);
    const desktopKartya = await page.locator('#foglalas-szolgaltatas-kartyak .foglalas-valaszto-kartya').first().boundingBox();
    expect(desktopKartya.height).toBeLessThanOrEqual(96);
    const desktopOsszefoglalo = await page.locator('#foglalas-osszefoglalo').boundingBox();
    const desktopKuldes = await page.locator('#foglalas-kuldes').boundingBox();
    expect(desktopKuldes.y - (desktopOsszefoglalo.y + desktopOsszefoglalo.height)).toBeGreaterThanOrEqual(20);
    expect(Math.abs(
        (desktopKuldes.x + desktopKuldes.width) - (desktopOsszefoglalo.x + desktopOsszefoglalo.width)
    )).toBeLessThanOrEqual(1);
    expect(desktopKuldes.width).toBeLessThanOrEqual(280);

    await page.locator('[data-booking-path="online"]').click();
    await expect(page.locator('body')).not.toHaveClass(/foglalas-folyamat-aktiv/);
    await expect(page.locator('.foglalas-nyito')).toBeVisible();
    await expect(page.locator('#foglalas-ellenorzes')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('.foglalas-lepes:visible')).toHaveCount(5);
    const csoportok = page.locator('#foglalas-szolgaltatas-kartyak .foglalas-szolgaltatas-csoport');
    await expect(csoportok).toHaveCount(4);
    await expect(csoportok.locator('.foglalas-szolgaltatas-csoport-cim')).toHaveText([
        'Építés',
        'Töltés',
        'Manikűr',
        'Gél lakk'
    ]);
    expect(await page.locator('#foglalas-szolgatatas optgroup').evaluateAll(
        (elemek) => elemek.map((elem) => elem.label)
    )).toEqual(['Építés', 'Töltés', 'Manikűr', 'Gél lakk']);

    const csoportMeretek = await csoportok.evaluateAll((elemek) => elemek.map((elem) => ({
        kartyaDb: elem.querySelectorAll('.foglalas-valaszto-kartya').length,
        felsoEl: elem.getBoundingClientRect().top,
        alsoEl: elem.getBoundingClientRect().bottom
    })));
    expect(csoportMeretek.map(({ kartyaDb }) => kartyaDb)).toEqual([3, 3, 3, 2]);
    expect(csoportMeretek[1].felsoEl).toBeGreaterThanOrEqual(csoportMeretek[0].alsoEl);
    expect(csoportMeretek[2].felsoEl).toBeGreaterThanOrEqual(csoportMeretek[1].alsoEl);
    expect(csoportMeretek[3].felsoEl).toBeGreaterThanOrEqual(csoportMeretek[2].alsoEl);

    const epitesKartyak = csoportok.nth(0).locator('.foglalas-valaszto-kartya');
    await expect(epitesKartyak.locator('.foglalas-kartya-cim')).toHaveText(['S méret', 'M méret', 'L méret']);
    const epitesFelsoElek = await epitesKartyak.evaluateAll(
        (elemek) => elemek.map((elem) => Math.round(elem.getBoundingClientRect().top))
    );
    expect(new Set(epitesFelsoElek).size).toBe(1);

    const szolgaltatasKartya = await page.locator('#foglalas-szolgaltatas-kartyak .foglalas-valaszto-kartya').first().boundingBox();
    const stilusKartya = await page.locator('.foglalas-stilus-kartya').first().boundingBox();
    expect(szolgaltatasKartya.height).toBeLessThanOrEqual(80);
    expect(stilusKartya.height).toBeLessThanOrEqual(80);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const telefonMezoStilus = await page.locator('.tel-csoport > .urlap-mezo').evaluate((mezo) => {
        const mezoStilus = getComputedStyle(mezo);
        const csoportStilus = getComputedStyle(mezo.parentElement);
        return {
            kulsoKeret: csoportStilus.borderRightWidth,
            belsoKeret: mezoStilus.borderRightWidth,
            betumeret: Number.parseFloat(mezoStilus.fontSize)
        };
    });
    expect(telefonMezoStilus).toEqual({
        kulsoKeret: '1px',
        belsoKeret: '0px',
        betumeret: 22
    });
    const mobilOsszefoglalo = await page.locator('#foglalas-osszefoglalo').boundingBox();
    const mobilKuldes = await page.locator('#foglalas-kuldes').boundingBox();
    expect(mobilKuldes.y - (mobilOsszefoglalo.y + mobilOsszefoglalo.height)).toBeGreaterThanOrEqual(20);
    expect(Math.abs(mobilKuldes.x - mobilOsszefoglalo.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(mobilKuldes.width - mobilOsszefoglalo.width)).toBeLessThanOrEqual(1);
    await expect(page.locator('#foglalas-status')).toBeHidden();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.foglalas-szolgaltatas-csoport')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('.foglalas-szolgaltatas-csoport')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
});

test('a foglalások között kötelező a 30 perces szünet', () => {
    const migration = fs.readFileSync(path.resolve(__dirname, '..', 'supabase-booking-buffer.sql'), 'utf8');
    const schema = fs.readFileSync(path.resolve(__dirname, '..', 'supabase-schema.sql'), 'utf8');
    const styleMigration = fs.readFileSync(path.resolve(__dirname, '..', 'supabase-booking-style-duration.sql'), 'utf8');
    const blockedTimeMigration = fs.readFileSync(path.resolve(__dirname, '..', 'supabase-blocked-time-status.sql'), 'utf8');
    const bufferedRange = "b.ends_at + interval '30 minutes'";
    const bufferedSlot = "slots.ends_at + interval '30 minutes'";

    [migration, schema, styleMigration, blockedTimeMigration].forEach(sql => {
        expect(sql).toContain(bufferedRange);
        expect(sql).toContain(bufferedSlot);
    });
    expect(migration).toContain('create trigger bookings_enforce_buffer');
    expect(migration).toContain("new.ends_at + interval '30 minutes'");

    const utkozik = (meglevoVege, ujKezdete) => ujKezdete < meglevoVege + 30;
    expect(utkozik(12 * 60 + 30, 12 * 60 + 30)).toBe(true);
    expect(utkozik(12 * 60 + 30, 13 * 60)).toBe(false);
});

test('a fő publikus oldalak nagyíthatók és helyes főcím-struktúrát használnak', async ({ page }) => {
    for (const path of ['/', '/arlista/', '/galeria/', '/foglalas/']) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /maximum-scale/);
    }
});

test('a mobil főoldal címei törnek, a térközei és a CTA nyilai egységesek', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const cimStilusok = await page.locator(
        '#szolgaltatasok h2, .galeria-showcase-fej h2, #kapcsolat h2'
    ).evaluateAll((cimek) => cimek.map((cim) => {
        const stilus = getComputedStyle(cim);
        return {
            whiteSpace: stilus.whiteSpace,
            lineHeight: Number.parseFloat(stilus.lineHeight)
        };
    }));
    expect(cimStilusok.every(({ whiteSpace, lineHeight }) =>
        whiteSpace === 'normal' && lineHeight > 0
    )).toBe(true);

    const nyilak = await page.locator(
        '.hero-visual-cimke a > span, .szoveges-link > span, .szolgaltatas-kartya > a > span'
    ).allTextContents();
    expect(nyilak.length).toBeGreaterThan(0);
    expect(nyilak.every((nyil) => nyil.trim() === '→')).toBe(true);

    const szekcioTavolsagok = await page.locator(
        '#bemutatkozas, #szolgaltatasok, #galeria-atvezeto'
    ).evaluateAll((szekciok) => szekciok.map(
        (szekcio) => Number.parseFloat(getComputedStyle(szekcio).marginBottom)
    ));
    expect(szekcioTavolsagok).toEqual([64, 64, 64]);
});

test('a galéria képnézegető fókusza bent marad, majd visszatér a megnyitó képre', async ({ page }) => {
    await page.goto('/galeria/', { waitUntil: 'domcontentloaded' });
    const elsoKep = page.locator('.galeria-kep-gomb').first();
    const lightbox = page.locator('#galeria-lightbox');
    const bezaras = lightbox.locator('.galeria-lightbox-bezar');

    await expect(elsoKep).toBeVisible();
    await elsoKep.focus();
    await elsoKep.click();
    await expect(lightbox).toHaveAttribute('aria-hidden', 'false');
    await expect(bezaras).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(lightbox.locator('.galeria-lightbox-kovetkezo')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(lightbox).toHaveAttribute('aria-hidden', 'true');
    await expect(elsoKep).toBeFocused();
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
    await desktopManageLink.click();
    await expect(page).toHaveURL(/#foglalas-ellenorzes$/);
    await expect(section).toBeVisible();
    const desktopTargetOffset = await page.evaluate(() => {
        const header = document.querySelector('header').getBoundingClientRect();
        const target = document.getElementById('foglalas-ellenorzes').getBoundingClientRect();
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        return {
            headerBottom: header.bottom,
            targetTop: target.top,
            reachedPageEnd: Math.abs(window.scrollY - maxScroll) <= 2
        };
    });
    expect(desktopTargetOffset.targetTop).toBeGreaterThanOrEqual(desktopTargetOffset.headerBottom);
    expect(
        desktopTargetOffset.targetTop <= desktopTargetOffset.headerBottom + 48
        || desktopTargetOffset.reachedPageEnd
    ).toBe(true);

    const desktopColumns = await section.evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
    );
    expect(desktopColumns).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
        window.history.replaceState(null, '', '/foglalas/');
        window.scrollTo(0, 0);
    });
    await page.locator('.hamburger').click();
    await mobileManageLink.click();
    await expect(page).toHaveURL(/#foglalas-ellenorzes$/);
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
    const mobileTargetOffset = await page.evaluate(() => {
        const header = document.querySelector('header').getBoundingClientRect();
        const target = document.getElementById('foglalas-ellenorzes').getBoundingClientRect();
        return { headerBottom: header.bottom, targetTop: target.top };
    });
    expect(mobileTargetOffset.targetTop).toBeGreaterThanOrEqual(mobileTargetOffset.headerBottom);
    expect(mobileTargetOffset.targetTop).toBeLessThanOrEqual(mobileTargetOffset.headerBottom + 48);
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
    expect(sql).toContain("v_reference := 'LUMI-'");
    expect(sql).toContain("legacy_public_reference");
    expect(sql).toContain("b.public_reference ~* '^LUMI(?:-[A-Z0-9]{4}){5}$'");
    expect(sql).toContain("coalesce(b.legacy_public_reference, '')");
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
    const adminStilus = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'styles', '99-unified-design.css'),
        'utf8'
    );
    const adminNaptarForras = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'admin', '15-bookings-calendar.js'),
        'utf8'
    );
    expect(adminBundle).toContain("select('id,public_reference,starts_at')");
    expect(adminBundle).toContain('admin-foglalas-azonosito');
    expect(adminBundle).toContain('admin-foglalas-nev-blokk');
    expect(adminBundle).toContain('foglalasKeresesTorlesGombFrissitese');
    expect(adminBundle).not.toContain('admin-foglalas-reszlet-szeles admin-foglalas-azonosito');
    expect(adminNaptarForras).toContain("!['cancelled', 'cancelled_by_customer'].includes");
    expect(adminNaptarForras).toContain('.filter(foglalasNaptarbanLathato)');
    expect(adminNaptarForras).toContain('napiElemek.slice(0, 2)');
    expect(adminNaptarForras).toContain("+ html(foglalasNaptarIdo(elem.datum)) + '</time></span>'");
    expect(adminNaptarForras).toContain("(napiElemek.length - 2) + '</span>'");
    expect(adminNaptarForras).toContain('foglalasKeresesTorlesGombFrissitese(elemek);');
    expect(adminStilus).toContain('container: admin-workspace / inline-size');
    expect(adminStilus).toContain('@container admin-workspace (max-width: 700px)');

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
        panel.querySelector('#admin-foglalas-lista').insertAdjacentHTML('beforeend', `
            <article class="admin-db-kartya admin-foglalas-kartya admin-foglalas-statusz-confirmed" data-azonosito-elrendezes-teszt>
                <div class="admin-db-kartya-fej">
                    <div class="admin-foglalas-fosor">
                        <div class="admin-foglalas-nev-blokk">
                            <p class="admin-kartya-tipus admin-foglalas-azonosito"><code>LUMI-A2B4</code></p>
                            <h3>Varga Petra Alexandra Hosszúpróbaneve</h3>
                            <p class="admin-foglalas-rovid-szolgaltatas">Építés - M méret</p>
                        </div>
                        <p class="admin-foglalas-idopont"><span class="admin-foglalas-datum">05/08/26</span><span class="admin-foglalas-ido">10:00 – 11:00</span></p>
                    </div>
                    <div class="admin-foglalas-vezerlok">
                        <select class="admin-db-statusz" disabled><option>Visszaigazolva</option></select>
                        <button type="button" class="admin-kis-gomb" data-foglalas-reszletek aria-expanded="false">Részletek</button>
                        <button type="button" class="admin-kis-gomb">Szerkesztés</button>
                    </div>
                </div>
                <div class="admin-foglalas-reszletek"><p>teszt@example.com · +36 20 123 4567</p></div>
            </article>
            <article class="admin-db-kartya admin-foglalas-kartya admin-db-kartya-tiltas admin-foglalas-statusz-blocked" data-tiltas-elrendezes-teszt>
                <div class="admin-db-kartya-fej">
                    <div class="admin-foglalas-fosor">
                        <div class="admin-foglalas-nev-blokk">
                            <span class="admin-kartya-tipus">Kézzel felvett idő</span>
                            <h3>Varga Petra Alexandra Hosszúpróbaneve</h3>
                            <p class="admin-foglalas-rovid-szolgaltatas">Kézzel rögzített időpont</p>
                        </div>
                        <p class="admin-foglalas-idopont"><span class="admin-foglalas-datum">05/08/26</span><span class="admin-foglalas-ido">10:00 – 11:00</span></p>
                    </div>
                    <div class="admin-foglalas-vezerlok">
                        <select class="admin-db-statusz" disabled><option>Foglalt</option></select>
                        <button type="button" class="admin-kis-gomb">Naptárba</button>
                        <button type="button" class="admin-kis-gomb">Szerkesztés</button>
                    </div>
                </div>
            </article>
        `);
    });
    const azonositoElrendezes = await page.locator('[data-azonosito-elrendezes-teszt] .admin-foglalas-azonosito').evaluate((elem) => {
        const stilus = getComputedStyle(elem);
        const kodStilus = getComputedStyle(elem.querySelector('code'));
        return {
            nevBlokkban: Boolean(elem.closest('.admin-foglalas-nev-blokk')),
            nevElott: elem.nextElementSibling?.tagName === 'H3',
            teljesSzelesseg: elem.getBoundingClientRect().width >= elem.parentElement.getBoundingClientRect().width,
            kodBetumeret: kodStilus.fontSize,
            keret: stilus.borderTopWidth,
            hatter: stilus.backgroundColor
        };
    });
    expect(azonositoElrendezes).toEqual({
        nevBlokkban: true,
        nevElott: true,
        teljesSzelesseg: false,
        kodBetumeret: '9px',
        keret: '0px',
        hatter: 'rgba(0, 0, 0, 0)'
    });

    const kartyaSzerkezet = await page.locator('[data-azonosito-elrendezes-teszt], [data-tiltas-elrendezes-teszt]').evaluateAll((kartyak) =>
        kartyak.map((kartya) => {
            const fosor = kartya.querySelector('.admin-foglalas-fosor').getBoundingClientRect();
            const datum = kartya.querySelector('.admin-foglalas-datum').getBoundingClientRect();
            const ido = kartya.querySelector('.admin-foglalas-ido').getBoundingClientRect();
            return {
                balOldaliSorok: kartya.querySelector('.admin-foglalas-nev-blokk').children.length,
                fosorMagassag: fosor.height,
                datumAzIdoFelett: datum.bottom <= ido.top + 1,
                jobbSzelEgyvonalban: Math.abs(datum.right - ido.right) <= 1
            };
        })
    );
    expect(kartyaSzerkezet[0].balOldaliSorok).toBe(3);
    expect(kartyaSzerkezet[1].balOldaliSorok).toBe(3);
    expect(Math.abs(kartyaSzerkezet[0].fosorMagassag - kartyaSzerkezet[1].fosorMagassag)).toBeLessThanOrEqual(1);
    expect(kartyaSzerkezet.every(({ datumAzIdoFelett, jobbSzelEgyvonalban }) =>
        datumAzIdoFelett && jobbSzelEgyvonalban
    )).toBe(true);

    const statuszSzinek = await page.locator('#admin-foglalas-lista').evaluate((lista) => {
        const statuszok = ['pending', 'confirmed', 'blocked', 'done', 'cancelled', 'cancelled_by_customer'];
        return Object.fromEntries(statuszok.map((statusz) => {
            const kartya = document.createElement('article');
            kartya.className = `admin-foglalas-kartya admin-foglalas-statusz-${statusz}`;
            kartya.innerHTML = '<select class="admin-db-statusz" disabled><option>Állapot</option></select>';
            lista.appendChild(kartya);
            const mezo = kartya.querySelector('select');
            const stilus = getComputedStyle(mezo);
            const szin = { hatter: stilus.backgroundColor, szoveg: stilus.color };
            kartya.remove();
            return [statusz, szin];
        }));
    });
    expect(statuszSzinek.blocked).toEqual(statuszSzinek.confirmed);
    expect(new Set([
        statuszSzinek.pending.hatter,
        statuszSzinek.confirmed.hatter,
        statuszSzinek.done.hatter,
        statuszSzinek.cancelled.hatter,
        statuszSzinek.cancelled_by_customer.hatter
    ]).size).toBe(5);
    expect(statuszSzinek.cancelled).toEqual({ hatter: 'rgb(46, 41, 39)', szoveg: 'rgb(255, 255, 255)' });
    expect(statuszSzinek.done.hatter).toBe('rgb(226, 239, 229)');

    const naptarStatuszSzinek = await page.locator('#admin-panel-foglalasok').evaluate((panel) => {
        const statuszok = ['pending', 'confirmed', 'blocked', 'done'];
        return Object.fromEntries(statuszok.map((statusz) => {
            const esemeny = document.createElement('span');
            esemeny.className = `admin-foglalas-naptar-esemeny admin-foglalas-naptar-statusz-${statusz}`;
            panel.appendChild(esemeny);
            const hatter = getComputedStyle(esemeny).backgroundColor;
            esemeny.remove();
            return [statusz, hatter];
        }));
    });
    expect(naptarStatuszSzinek).toEqual({
        pending: statuszSzinek.pending.hatter,
        confirmed: statuszSzinek.confirmed.hatter,
        blocked: statuszSzinek.blocked.hatter,
        done: statuszSzinek.done.hatter
    });

    const kompaktKartya = page.locator('[data-azonosito-elrendezes-teszt]');
    const kompaktMagassag = (await kompaktKartya.boundingBox()).height;
    await expect(kompaktKartya.locator('.admin-foglalas-reszletek')).toBeHidden();
    await kompaktKartya.locator('[data-foglalas-reszletek]').click();
    await expect(kompaktKartya.locator('[data-foglalas-reszletek]')).toHaveAttribute('aria-expanded', 'true');
    await expect(kompaktKartya.locator('.admin-foglalas-reszletek')).toBeVisible();
    expect((await kompaktKartya.boundingBox()).height).toBeGreaterThan(kompaktMagassag);

    const desktopSidebar = await sidebar.boundingBox();
    const desktopMain = await main.boundingBox();
    expect(desktopSidebar.x + desktopSidebar.width).toBeLessThanOrEqual(desktopMain.x + 1);

    await page.setViewportSize({ width: 590, height: 844 });
    const szelesMobilKartya = await kompaktKartya.evaluate((kartya) => {
        const nevBlokk = kartya.querySelector('.admin-foglalas-nev-blokk').getBoundingClientRect();
        const idopont = kartya.querySelector('.admin-foglalas-idopont').getBoundingClientRect();
        const vezerlok = kartya.querySelector('.admin-foglalas-vezerlok').getBoundingClientRect();
        const elemek = Array.from(kartya.querySelectorAll('.admin-foglalas-vezerlok > *'))
            .map(elem => elem.getBoundingClientRect());
        return {
            idopontJobbra: idopont.left >= nevBlokk.right - 1,
            vezerlokAzAdatokAlatt: vezerlok.y >= Math.max(nevBlokk.bottom, idopont.bottom) - 1,
            vezerloAtfedes: elemek.some((doboz, index) => elemek.slice(index + 1).some(masik =>
                doboz.right > masik.left + 1 && masik.right > doboz.left + 1
                && doboz.bottom > masik.top + 1 && masik.bottom > doboz.top + 1
            ))
        };
    });
    expect(szelesMobilKartya).toEqual({
        idopontJobbra: true,
        vezerlokAzAdatokAlatt: true,
        vezerloAtfedes: false
    });
    const szelesMobilTiltas = await page.locator('[data-tiltas-elrendezes-teszt]').evaluate((kartya) => {
        const nevBlokk = kartya.querySelector('.admin-foglalas-nev-blokk').getBoundingClientRect();
        const idopont = kartya.querySelector('.admin-foglalas-idopont').getBoundingClientRect();
        const vezerlok = kartya.querySelector('.admin-foglalas-vezerlok').getBoundingClientRect();
        const elemek = Array.from(kartya.querySelectorAll('.admin-foglalas-vezerlok > *'))
            .map(elem => elem.getBoundingClientRect());
        return {
            idopontJobbra: idopont.left >= nevBlokk.right - 1,
            vezerlokAzAdatokAlatt: vezerlok.y >= Math.max(nevBlokk.bottom, idopont.bottom) - 1,
            vezerloAtfedes: elemek.some((doboz, index) => elemek.slice(index + 1).some(masik =>
                doboz.right > masik.left + 1 && masik.right > doboz.left + 1
                && doboz.bottom > masik.top + 1 && masik.bottom > doboz.top + 1
            ))
        };
    });
    expect(szelesMobilTiltas).toEqual({
        idopontJobbra: true,
        vezerlokAzAdatokAlatt: true,
        vezerloAtfedes: false
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(590);

    const adminPanelMegjelenitese = async (panelNev) => {
        await page.evaluate((nev) => {
            document.querySelectorAll('.admin-db-panel').forEach((panel) => {
                panel.classList.toggle('aktiv', panel.id === `admin-panel-${nev}`);
            });
        }, panelNev);
    };
    const zoomSzelessegek = [320, 375, 390, 414, 521, 590, 768, 769, 844, 901, 1024, 1440];
    const kompaktTiltasSzelessegek = new Set([320, 375, 390, 414, 521, 590, 769, 844, 901, 1024]);
    const adminPanelek = [
        'foglalasok',
        'szolgaltatasok',
        'kuponok',
        'idosavok',
        'tiltasok',
        'esemenynaplo',
        'emailteszt',
        'szovegek'
    ];

    for (const szelesseg of zoomSzelessegek) {
        await page.setViewportSize({ width: szelesseg, height: 900 });

        for (const panelNev of adminPanelek) {
            await adminPanelMegjelenitese(panelNev);
            const levagottElemek = await page.evaluate(() => {
                const foTerulet = document.querySelector('.admin-workspace-main').getBoundingClientRect();
                const aktivPanel = document.querySelector('.admin-db-panel.aktiv');
                return Array.from(aktivPanel.querySelectorAll('input, select, textarea, button, .admin-mezo, .admin-naptar-blokk'))
                    .filter((elem) => {
                        const stilus = getComputedStyle(elem);
                        if (stilus.display === 'none' || stilus.visibility === 'hidden') return false;
                        const doboz = elem.getBoundingClientRect();
                        return doboz.width > 0
                            && (doboz.left < foTerulet.left - 1 || doboz.right > foTerulet.right + 1);
                    })
                    .map((elem) => elem.id || elem.className || elem.tagName);
            });
            expect(levagottElemek, `${panelNev} panel, ${szelesseg}px`).toEqual([]);
        }

        if (kompaktTiltasSzelessegek.has(szelesseg)) {
            await adminPanelMegjelenitese('tiltasok');
            const tiltasUrlap = await page.locator('#admin-tiltas-form .admin-tiltas-sor').evaluate((sor) => {
                const [datum, kezdes, vege, megjegyzes] = Array.from(sor.children)
                    .map((elem) => elem.getBoundingClientRect());
                const sorDoboz = sor.getBoundingClientRect();
                return {
                    datumTeljesSzelessegu: datum.width >= sorDoboz.width - 1,
                    idokEgySorban: Math.abs(kezdes.top - vege.top) <= 1,
                    megjegyzesTeljesSzelessegu: megjegyzes.width >= sorDoboz.width - 1,
                    megjegyzesAzIdokAlatt: megjegyzes.top >= Math.max(kezdes.bottom, vege.bottom) - 1
                };
            });
            expect(tiltasUrlap, `foglalt ido urlap, ${szelesseg}px`).toEqual({
                datumTeljesSzelessegu: true,
                idokEgySorban: true,
                megjegyzesTeljesSzelessegu: true,
                megjegyzesAzIdokAlatt: true
            });
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(szelesseg);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await adminPanelMegjelenitese('foglalasok');
    const mobileSidebar = await sidebar.boundingBox();
    const mobileMain = await main.boundingBox();
    expect(mobileMain.y).toBeGreaterThanOrEqual(mobileSidebar.y + mobileSidebar.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const mobilNev = await page.locator('[data-azonosito-elrendezes-teszt] h3').evaluate((elem) => {
        const stilus = getComputedStyle(elem);
        return {
            whiteSpace: stilus.whiteSpace,
            overflow: stilus.overflow,
            textOverflow: stilus.textOverflow,
            magassag: elem.getBoundingClientRect().height,
            sormagassag: Number.parseFloat(stilus.lineHeight)
        };
    });
    expect(mobilNev.whiteSpace).toBe('normal');
    expect(mobilNev.overflow).toBe('visible');
    expect(mobilNev.textOverflow).toBe('clip');
    expect(mobilNev.magassag).toBeGreaterThan(mobilNev.sormagassag);

    const mobilKartyaElrendezes = await kompaktKartya.evaluate((kartya) => {
        const nevBlokk = kartya.querySelector('.admin-foglalas-nev-blokk').getBoundingClientRect();
        const idopont = kartya.querySelector('.admin-foglalas-idopont').getBoundingClientRect();
        const vezerlok = kartya.querySelector('.admin-foglalas-vezerlok').getBoundingClientRect();
        const gombok = Array.from(kartya.querySelectorAll('.admin-foglalas-vezerlok > *'))
            .map(elem => elem.getBoundingClientRect());
        return {
            idopontJobbra: idopont.left >= nevBlokk.right - 1,
            vezerlokAzAdatokAlatt: vezerlok.y >= Math.max(nevBlokk.bottom, idopont.bottom) - 1,
            vezerloAtfedes: gombok.some((doboz, index) => gombok.slice(index + 1).some(masik =>
                doboz.right > masik.left + 1 && masik.right > doboz.left + 1
                && doboz.bottom > masik.top + 1 && masik.bottom > doboz.top + 1
            ))
        };
    });
    expect(mobilKartyaElrendezes).toEqual({
        idopontJobbra: true,
        vezerlokAzAdatokAlatt: true,
        vezerloAtfedes: false
    });

    await page.locator('#admin-foglalas-lapozo').evaluate((lapozo) => {
        lapozo.innerHTML = '<button type="button">Előző</button><span>1 / 4</span><button type="button">Következő</button>';
    });
    const mobilAlsoTerkoz = await page.locator('#admin-foglalas-lapozo').evaluate((lapozo) => {
        const stilus = getComputedStyle(lapozo);
        return {
            marginAlul: Number.parseFloat(stilus.marginBottom),
            belsoTerAlul: Number.parseFloat(stilus.paddingBottom)
        };
    });
    expect(mobilAlsoTerkoz).toEqual({ marginAlul: 0, belsoTerAlul: 0 });

    const adminMezoBetumeret = await page.locator('#admin-foglalas-kereses').evaluate(
        (mezo) => Number.parseFloat(getComputedStyle(mezo).fontSize)
    );
    expect(adminMezoBetumeret).toBeGreaterThanOrEqual(16);

    const foglalasKereses = page.locator('#admin-foglalas-kereses');
    const foglalasKeresesTorles = page.locator('#admin-foglalas-kereses-torles');
    await expect(foglalasKeresesTorles).toBeHidden();
    await foglalasKereses.fill('Varga Petra');
    await expect(foglalasKeresesTorles).toBeVisible();
    const torlesMeret = await foglalasKeresesTorles.boundingBox();
    expect(torlesMeret.width).toBeGreaterThanOrEqual(44);
    expect(torlesMeret.height).toBeGreaterThanOrEqual(44);
    await foglalasKeresesTorles.click();
    await expect(foglalasKereses).toHaveValue('');
    await expect(foglalasKeresesTorles).toBeHidden();
    expect(await foglalasKereses.evaluate((mezo) => document.activeElement === mezo)).toBe(true);

    const naptarNezetGomb = page.locator('[data-foglalas-nezet="naptar"]');
    const listaNezetGomb = page.locator('[data-foglalas-nezet="lista"]');
    await expect(naptarNezetGomb).toHaveAttribute('aria-pressed', 'false');
    await naptarNezetGomb.click();
    await expect(naptarNezetGomb).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#admin-foglalas-naptar')).toBeVisible();
    await expect(page.locator('#admin-foglalas-lista-nezet')).toBeHidden();
    await expect(page.locator('#admin-foglalas-naptar-cim')).not.toHaveText('');
    expect(await page.locator('.admin-foglalas-naptar-hetfej span').count()).toBe(7);
    expect(await page.locator('[data-foglalas-naptar-datum]').count()).toBeGreaterThanOrEqual(28);
    expect(await page.locator('#admin-foglalas-naptar-racs').evaluate(
        (racs) => getComputedStyle(racs).gridTemplateColumns.split(' ').filter(Boolean).length
    )).toBe(7);
    await page.locator('[data-foglalas-naptar-datum]').first().evaluate((nap) => {
        nap.querySelector('.admin-foglalas-naptar-esemenyek').innerHTML = `
            <span class="admin-foglalas-naptar-esemeny admin-foglalas-naptar-statusz-confirmed"><time>09:00</time></span>
            <span class="admin-foglalas-naptar-esemeny admin-foglalas-naptar-statusz-pending"><time>12:30</time></span>
            <span class="admin-foglalas-naptar-tovabbi">+2</span>`;
    });
    await expect(page.locator('.admin-foglalas-naptar-esemeny time').first()).toBeVisible();
    await expect(page.locator('.admin-foglalas-naptar-tovabbi').first()).toHaveText('+2');
    await page.locator('[data-foglalas-naptar-datum]').first().click();
    await expect(page.locator('[data-foglalas-naptar-datum][aria-pressed="true"]')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.setViewportSize({ width: 375, height: 667 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await page.setViewportSize({ width: 844, height: 390 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
    await page.setViewportSize({ width: 390, height: 844 });
    await listaNezetGomb.click();
    await expect(page.locator('#admin-foglalas-lista-nezet')).toBeVisible();
    await expect(page.locator('#admin-foglalas-naptar')).toBeHidden();

    await page.locator('[data-admin-tab="emailteszt"]').click();
    await expect(page.locator('#admin-panel-emailteszt')).toBeVisible();
    await expect(page.locator('#admin-email-teszt-kuldes')).toBeVisible();
    await expect(page.locator('#admin-lebego-mentes')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
