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
