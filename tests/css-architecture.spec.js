const fs = require('fs');
const path = require('path');
const { test, expect } = require('playwright/test');

test('a főoldali Szolgáltatások CSS a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const adminCss = fs.readFileSync(path.join(root, 'src', 'styles', '40-admin.css'), 'utf8');

    expect(publicCss).toContain('SZOLGÁLTATÁSOK');
    expect(publicCss).toContain('#szolgaltatasok {');
    expect(publicCss).toContain('.szolgaltatas-lista {');
    expect(adminCss).not.toContain('#szolgaltatasok {');
    expect(adminCss).not.toContain('.szolgaltatas-lista {');
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
