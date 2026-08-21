const fs = require('fs');
const path = require('path');
const { test, expect } = require('playwright/test');

test('a főoldali Szolgáltatások CSS a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const adminCss = fs.readFileSync(path.join(root, 'src', 'styles', '40-admin.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('SZOLGÁLTATÁSOK');
    expect(publicCss).toContain('#szolgaltatasok {');
    expect(publicCss).toContain('.szolgaltatas-lista {');
    expect(adminCss).not.toContain('#szolgaltatasok {');
    expect(adminCss).not.toContain('.szolgaltatas-lista {');
    expect(publicCss).toContain('Home services — végleges megjelenés (99-ből migrálva)');
    expect(unifiedCss).not.toContain('/* Home services */');
    expect(unifiedCss).not.toContain('.szolgaltatas-kartya');
    expect(unifiedCss).not.toContain('#szolgaltatasok {');
});

test('a külön Galéria oldal végleges layoutja a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('GALÉRIA OLDAL');
    expect(publicCss).toContain('column-count: 4');
    expect(publicCss).toContain('column-count: 3');
    expect(publicCss).toContain('column-count: 2');
    expect(unifiedCss).not.toContain('Standalone gallery: CSS columns avoid empty grid holes.');
    expect(unifiedCss).not.toContain('.galeria-racs {');
});

test('a lábléc végleges CSS-e a publikus komponensrétegben él', async ({ page }) => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Footer — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('.site-footer,');
    expect(publicCss).toContain('padding: 20px 20px calc(22px + env(safe-area-inset-bottom));');
    expect(unifiedCss).not.toContain('/* Footer */');
    expect(unifiedCss).not.toContain('padding: 20px 20px calc(22px + env(safe-area-inset-bottom));');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const desktop = await page.locator('.site-footer').evaluate((footer) => {
        const style = getComputedStyle(footer);
        return {
            background: style.backgroundColor,
            paddingTop: style.paddingTop,
            maxWidth: style.maxWidth
        };
    });
    expect(desktop).toEqual({
        background: 'rgb(145, 118, 110)',
        paddingTop: '40px',
        maxWidth: 'none'
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const mobile = await page.locator('.site-footer').evaluate((footer) => {
        const style = getComputedStyle(footer);
        return {
            paddingTop: style.paddingTop,
            paddingRight: style.paddingRight,
            paddingBottom: style.paddingBottom,
            paddingLeft: style.paddingLeft
        };
    });
    expect(mobile).toEqual({
        paddingTop: '20px',
        paddingRight: '20px',
        paddingBottom: '22px',
        paddingLeft: '20px'
    });
});

test('a jogi oldal végleges CSS-e a publikus komponensrétegben él', async ({ page }) => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('/* Legal */');
    expect(publicCss).toContain('.jogi-fejlec {');
    expect(publicCss).toContain('.jogi-elrendezes {');
    expect(publicCss).toContain('.jogi-oldalsav {');
    expect(unifiedCss).not.toContain('/* Legal */');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/adatkezeles/', { waitUntil: 'domcontentloaded' });
    const desktop = await page.evaluate(() => ({
        headerDisplay: getComputedStyle(document.querySelector('.jogi-fejlec')).display,
        layoutDisplay: getComputedStyle(document.querySelector('.jogi-elrendezes')).display,
        sidebarPosition: getComputedStyle(document.querySelector('.jogi-oldalsav')).position,
        borderBottomStyle: getComputedStyle(document.querySelector('.jogi-fejlec')).borderBottomStyle
    }));
    expect(desktop).toEqual({
        headerDisplay: 'grid',
        layoutDisplay: 'grid',
        sidebarPosition: 'sticky',
        borderBottomStyle: 'solid'
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/adatkezeles/', { waitUntil: 'domcontentloaded' });
    expect(await page.locator('.jogi-oldalsav').evaluate(elem => getComputedStyle(elem).position)).toBe('static');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('a főoldali kupon banner végleges CSS-e a publikus komponensrétegben él', async ({ page }) => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Coupon — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('.fooldal .akcios-banner {');
    expect(publicCss).toContain('.fooldal .akcios-banner-belso {');
    expect(unifiedCss).not.toContain('/* Coupon */');
    expect(unifiedCss).not.toContain('.fooldal .akcios-banner-kupon {');

    const renderCouponFixture = () => page.evaluate(() => {
        const banner = document.getElementById('akcios-banner');
        banner.hidden = false;
        banner.innerHTML = '<div class=akcios-banner-slider><article class=akcios-banner-belso><div class=akcios-banner-szoveg><span class=akcios-banner-kicker>Aktuális ajánlat</span><h2 class=akcios-banner-cim>Teszt kupon</h2><p>Teszt leírás</p></div><div class=akcios-banner-kupon><span>Kedvezmény</span><strong>TESZT10</strong></div><a>Foglalás kuponnal</a></article></div>';
        banner.querySelector('a').className = 'gomb akcios-banner-gomb';
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await renderCouponFixture();
    const desktop = await page.evaluate(() => {
        const banner = document.querySelector('.fooldal .akcios-banner');
        const slider = document.querySelector('.fooldal .akcios-banner-slider');
        const title = document.querySelector('.fooldal .akcios-banner .akcios-banner-cim');
        const button = document.querySelector('.fooldal .akcios-banner-gomb');
        if (!banner || !slider || !title || !button) return null;
        return {
            bannerWidth: getComputedStyle(banner).width,
            bannerMarginTop: getComputedStyle(banner).marginTop,
            sliderRadius: getComputedStyle(slider).borderRadius,
            sliderBackground: getComputedStyle(slider).backgroundColor,
            titleFont: getComputedStyle(title).fontFamily,
            buttonMinWidth: getComputedStyle(button).minWidth
        };
    });
    expect(desktop).toEqual({
        bannerWidth: '1040px',
        bannerMarginTop: '78px',
        sliderRadius: '4px',
        sliderBackground: 'rgb(145, 118, 110)',
        titleFont: '"Cormorant Garamond", serif',
        buttonMinWidth: '180px'
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await renderCouponFixture();
    const mobile = await page.evaluate(() => {
        const inner = document.querySelector('.fooldal .akcios-banner-belso');
        const coupon = document.querySelector('.fooldal .akcios-banner-kupon');
        const button = document.querySelector('.fooldal .akcios-banner-gomb');
        if (!inner || !coupon || !button) return null;
        return {
            columns: getComputedStyle(inner).gridTemplateColumns,
            paddingLeft: getComputedStyle(inner).paddingLeft,
            buttonMinWidth: getComputedStyle(button).minWidth,
            buttonWidth: getComputedStyle(button).width,
            couponWidth: getComputedStyle(coupon).width
        };
    });
    expect(mobile).not.toBeNull();
    expect(mobile.paddingLeft).toBe('20px');
    expect(mobile.buttonMinWidth).toBe('0px');
    expect(mobile.buttonWidth).toBe(mobile.couponWidth);
    expect(mobile.columns.split(' ').length).toBe(1);
});

test('a főoldali Bemutatkozás CSS-e a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Home introduction — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('#bemutatkozas {');
    expect(publicCss).toContain('.bemutatkozas-kep {');
    expect(unifiedCss).not.toContain('/* Home introduction */');
    expect(unifiedCss).not.toContain('#bemutatkozas');
    expect(unifiedCss).not.toContain('.bemutatkozas-kep');
});

test('a főoldali Contact CSS-e a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Home contact — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('.fooldal #kapcsolat {');
    expect(publicCss).toContain('.fooldal .kapcsolat-akcio {');
    expect(unifiedCss).not.toContain('.fooldal #kapcsolat');
    expect(unifiedCss).not.toContain('.kapcsolat-akcio');
    expect(unifiedCss).not.toContain('.kapcsolat-tartalom');
});

test('a főoldali vendégértesítő CSS-e a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Guest notice — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('.vendegertesito[hidden] {');
    expect(publicCss).toContain('.vendegertesito-szoveg {');
    expect(unifiedCss).not.toContain('.vendegertesito');
});

test('a közös publikus CSS helperek a komponensrétegben élnek', async ({ page }) => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Public helpers — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('.szoveges-link {');
    expect(publicCss).toContain('.kiemelt-stilus-kartya img,');
    expect(unifiedCss).not.toContain('.szoveges-link');
    expect(unifiedCss).not.toContain('.kiemelt-stilus-kartya');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const link = await page.locator('.szoveges-link').first().evaluate((element) => ({
        display: getComputedStyle(element).display,
        arrowFont: getComputedStyle(element.querySelector('span')).fontFamily
    }));
    expect(link).toEqual({ display: 'inline-flex', arrowFont: 'Arial, sans-serif' });

    const image = await page.evaluate(() => {
        const card = document.createElement('div');
        const img = document.createElement('img');
        card.className = 'kiemelt-stilus-kartya';
        card.append(img);
        document.body.append(card);
        const style = getComputedStyle(img);
        const result = { objectFit: style.objectFit, minHeight: style.minHeight, transform: style.transform };
        card.remove();
        return result;
    });
    expect(image).toEqual({ objectFit: 'contain', minHeight: '0px', transform: 'none' });
});

test('a főoldali galéria CSS-e a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Home gallery — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('#galeria-atvezeto {');
    expect(publicCss).toContain('.galeria-kartya-lapozo {');
    expect(publicCss).toContain('.galeria-kartya-vezerlok {');
    expect(unifiedCss).not.toContain('/* Home gallery');
    expect(unifiedCss).not.toContain('/* Homepage gallery');
    expect(unifiedCss).not.toContain('#galeria-atvezeto');
    expect(unifiedCss).not.toContain('.galeria-kartya');
    expect(unifiedCss).not.toContain('.galeria-showcase');
});

test('a booking főfelület CSS-e a booking rétegben él', async ({ page }) => {
    const root = path.resolve(__dirname, '..');
    const bookingCss = fs.readFileSync(path.join(root, 'src', 'styles', '30-booking.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(bookingCss).toContain('Booking — végleges megjelenés (99-ből migrálva)');
    expect(bookingCss).toContain('.foglalas-asszisztens {');
    expect(bookingCss).toContain('#foglalas-szolgaltatas-kartyak {');
    expect(bookingCss).toContain('.foglalas-datum-csik {');
    expect(unifiedCss).not.toContain('/* Booking */');
    expect(unifiedCss).not.toContain('.foglalas-asszisztens {');
    expect(unifiedCss).not.toContain('#foglalas-szolgaltatas-kartyak');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });
    const desktop = await page.evaluate(() => {
        const pageElement = document.querySelector('.foglalas-oldal');
        const intro = document.querySelector('.foglalas-nyito');
        const paths = document.querySelector('.foglalas-utak');
        const step = document.querySelector('.foglalas-lepes');
        return {
            pageWidth: Math.round(pageElement.getBoundingClientRect().width),
            introColumns: getComputedStyle(intro).gridTemplateColumns.split(' ').filter(Boolean).length,
            pathColumns: getComputedStyle(paths).gridTemplateColumns.split(' ').filter(Boolean).length,
            stepBorderBottom: getComputedStyle(step).borderBottomStyle,
            stepRadius: getComputedStyle(step).borderRadius
        };
    });
    expect(desktop).toEqual({
        pageWidth: 1120,
        introColumns: 2,
        pathColumns: 2,
        stepBorderBottom: 'solid',
        stepRadius: '0px'
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await page.evaluate(() => {
        const pageElement = document.querySelector('.foglalas-oldal');
        const intro = document.querySelector('.foglalas-nyito');
        const paths = document.querySelector('.foglalas-utak');
        const card = document.querySelector('.foglalas-ut-kartya');
        const step = document.querySelector('.foglalas-lepes');
        return {
            pageWidth: Math.round(pageElement.getBoundingClientRect().width),
            introColumns: getComputedStyle(intro).gridTemplateColumns.split(' ').filter(Boolean).length,
            pathColumns: getComputedStyle(paths).gridTemplateColumns.split(' ').filter(Boolean).length,
            cardMinHeight: getComputedStyle(card).minHeight,
            stepPaddingTop: getComputedStyle(step).paddingTop,
            documentWidth: document.documentElement.scrollWidth
        };
    });
    expect(mobile).toEqual({
        pageWidth: 358,
        introColumns: 1,
        pathColumns: 1,
        cardMinHeight: '0px',
        stepPaddingTop: '26px',
        documentWidth: 390
    });
});

test('a booking self-service CSS-e a booking rétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const bookingCss = fs.readFileSync(path.join(root, 'src', 'styles', '30-booking.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(bookingCss).toContain('Booking self-service — végleges megjelenés (99-ből migrálva)');
    expect(bookingCss).toContain('.foglalas-kezelo-szekcio {');
    expect(bookingCss).toContain('.foglalas-popup-azonosito {');
    expect(bookingCss).toContain('.foglalas-statusz-confirmed {');
    expect(unifiedCss).not.toContain('/* Booking self-service */');
    expect(unifiedCss).not.toContain('.foglalas-kezelo-szekcio');
    expect(unifiedCss).not.toContain('.foglalas-popup-azonosito');
});

test('a booking űrlap kiegészítő CSS-e a booking rétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const bookingCss = fs.readFileSync(path.join(root, 'src', 'styles', '30-booking.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(bookingCss).toContain('Booking form accessibility — végleges megjelenés (99-ből migrálva)');
    expect(bookingCss).toContain('.foglalas-mezo-csoport {');
    expect(bookingCss).toContain('.foglalas-fokozatos .foglalas-lepes[hidden] {');
    expect(bookingCss).toContain('.foglalas-oldal .urlap-mezo:focus,');
    expect(unifiedCss).not.toContain('.foglalas-mezo-csoport');
    expect(unifiedCss).not.toContain('.foglalas-fokozatos');
    expect(unifiedCss).not.toContain('.foglalas-oldal .urlap-mezo:focus');
    expect(unifiedCss).toContain('.admin-mezo-cimke {');
    expect(unifiedCss).toContain('.admin-body input:focus,');
});

test('a lebegő foglalás CTA CSS-e a publikus komponensrétegben él', async ({ page }) => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Floating booking CTA — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('.lebego-foglalas-gomb::after {');
    expect(publicCss).toContain('.lebego-foglalas-gomb.rejtve {');
    expect(unifiedCss).not.toContain('.lebego-foglalas-gomb');
    expect(unifiedCss).toContain('.admin-body #lebego-foglalas-gomb {');

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const button = page.locator('#lebego-foglalas-gomb');
    await expect(button).toBeAttached();
    await button.evaluate((element) => element.classList.remove('rejtve'));
    await expect(button).toHaveCSS('box-shadow', 'none');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(button).toHaveCSS('display', 'none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('a publikus foundation és hero CSS a publikus rétegben él', async ({ page }) => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('Public foundation and hero — végleges megjelenés (99-ből migrálva)');
    expect(publicCss).toContain('/* Home hero */');
    expect(publicCss).toContain('#hero.hero-preview-refresh {');
    expect(publicCss).toContain('.jogi-oldal {');
    expect(publicCss).toContain('#fo-tartalom input:not([type="checkbox"])');
    expect(unifiedCss).not.toContain('/* Home hero */');
    expect(unifiedCss).not.toContain('#hero.hero-preview-refresh');
    expect(unifiedCss).not.toContain('.jogi-oldal');
    expect(unifiedCss).not.toContain('#fo-tartalom');
    expect(unifiedCss).toContain('body.admin-body {');
    expect(unifiedCss).toContain('/* Admin iOS input fallback */');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const desktop = await page.locator('#hero.hero-preview-refresh').evaluate((hero) => ({
        display: getComputedStyle(hero).display,
        columns: getComputedStyle(hero).gridTemplateColumns.split(' ').filter(Boolean).length,
        width: Math.round(hero.getBoundingClientRect().width),
        height: Math.round(hero.getBoundingClientRect().height)
    }));
    expect(desktop).toEqual({ display: 'grid', columns: 2, width: 1440, height: 540 });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await page.locator('#hero.hero-preview-refresh').evaluate((hero) => ({
        display: getComputedStyle(hero).display,
        direction: getComputedStyle(hero).flexDirection,
        background: getComputedStyle(hero).backgroundColor,
        imageFit: getComputedStyle(hero.querySelector('.hero-kep')).objectFit,
        documentWidth: document.documentElement.scrollWidth
    }));
    expect(mobile).toEqual({
        display: 'flex',
        direction: 'column',
        background: 'rgb(145, 118, 110)',
        imageFit: 'contain',
        documentWidth: 390
    });
});

test('a legacy admin alap CSS a 40-admin rétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const adminCss = fs.readFileSync(path.join(root, 'src', 'styles', '40-admin.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(adminCss).toContain('Legacy admin base — végleges megjelenés (99-ből migrálva)');
    expect(adminCss).toContain('.admin-auth-panel {');
    expect(adminCss).toContain('.admin-eyebrow {');
    expect(adminCss).toContain('.admin-body #lebego-foglalas-gomb {');
    expect(unifiedCss).not.toContain('/* Admin */');
    expect(unifiedCss).not.toContain('\n.admin-auth-panel {\n');
    expect(unifiedCss).not.toContain('\n.admin-eyebrow {\n');
    expect(unifiedCss).not.toContain('.admin-body #lebego-foglalas-gomb');
});

test('a legacy admin workspace és CMS CSS a 40-admin rétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const adminCss = fs.readFileSync(path.join(root, 'src', 'styles', '40-admin.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(adminCss).toContain('Legacy admin workspace and CMS — végleges megjelenés (99-ből migrálva)');
    expect(adminCss).toContain('.admin-body .admin-workspace-layout {');
    expect(adminCss).toContain('.admin-body .admin-sidebar {');
    expect(adminCss).toContain('.admin-body .cms-editor-layout {');
    expect(unifiedCss).not.toContain('LUMI ADMIN WORKSPACE REDESIGN');
    expect(unifiedCss).not.toContain('.admin-body .admin-workspace-layout {');
    expect(unifiedCss).not.toContain('.admin-body .cms-editor-layout {');
});

test('a legacy admin foglalások CSS a 40-admin rétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const adminCss = fs.readFileSync(path.join(root, 'src', 'styles', '40-admin.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(adminCss).toContain('Legacy admin bookings — végleges megjelenés (99-ből migrálva)');
    expect(adminCss).toContain('#admin-panel-foglalasok .admin-foglalas-attekintes {');
    expect(adminCss).toContain('#admin-panel-foglalasok .admin-foglalas-naptar {');
    expect(adminCss).toContain('#admin-panel-foglalasok .admin-vendeg-lemondas-jelzes {');
    expect(unifiedCss).not.toContain('ADMIN FOGLALÁSOK – COMPACT DATA LIST');
    expect(unifiedCss).not.toContain('#admin-panel-foglalasok .admin-foglalas-attekintes {');
    expect(unifiedCss).not.toContain('#admin-panel-foglalasok .admin-foglalas-naptar {');
});
