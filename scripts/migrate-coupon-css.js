'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicCssPath = path.join(root, 'src', 'styles', '10-public-components.css');
const unifiedCssPath = path.join(root, 'src', 'styles', '99-unified-design.css');
const testPath = path.join(root, 'tests', 'css-architecture.spec.js');

function replaceOnce(source, before, after, label) {
    const first = source.indexOf(before);
    if (first === -1) throw new Error(`Nem található a várt rész: ${label}`);
    if (source.indexOf(before, first + before.length) !== -1) {
        throw new Error(`Többször szerepel a várt rész: ${label}`);
    }
    return source.slice(0, first) + after + source.slice(first + before.length);
}

let publicCss = fs.readFileSync(publicCssPath, 'utf8');
let unifiedCss = fs.readFileSync(unifiedCssPath, 'utf8');
let testSource = fs.readFileSync(testPath, 'utf8');

const couponStart = '/* Coupon */';
const couponEnd = '/* Home introduction */';
const couponStartIndex = unifiedCss.indexOf(couponStart);
const couponEndIndex = unifiedCss.indexOf(couponEnd);
if (couponStartIndex === -1 || couponEndIndex === -1 || couponEndIndex <= couponStartIndex) {
    throw new Error('A Coupon blokk határai nem találhatók a 99-unified-design.css fájlban.');
}
const couponBase = unifiedCss.slice(couponStartIndex, couponEndIndex).trimEnd();
unifiedCss = unifiedCss.slice(0, couponStartIndex) + unifiedCss.slice(couponEndIndex);

const mobileCouponStart = `    .fooldal .akcios-banner-belso {\n        grid-template-columns: 1fr;`;
const mobileCouponEndMarker = `\n\n    :root {`;
const mobileStartIndex = unifiedCss.indexOf(mobileCouponStart);
const mobileEndIndex = unifiedCss.indexOf(mobileCouponEndMarker, mobileStartIndex);
if (mobileStartIndex === -1 || mobileEndIndex === -1) {
    throw new Error('A Coupon mobil blokkja nem található a 99-unified-design.css fájlban.');
}
const mobileCouponIndented = unifiedCss.slice(mobileStartIndex, mobileEndIndex).trimEnd();
const mobileCoupon = mobileCouponIndented
    .split('\n')
    .map(line => line.startsWith('    ') ? line.slice(4) : line)
    .join('\n');
unifiedCss = unifiedCss.slice(0, mobileStartIndex) + unifiedCss.slice(mobileEndIndex);

const migratedBlock = `\n\n/* Coupon — végleges megjelenés (99-ből migrálva) */\n${couponBase.replace('/* Coupon */\n', '')}\n\n@media screen and (max-width: 768px) {\n${mobileCoupon.split('\n').map(line => `    ${line}`).join('\n')}\n}\n`;

if (publicCss.includes('Coupon — végleges megjelenés (99-ből migrálva)')) {
    throw new Error('A Coupon migrált blokk már szerepel a publikus CSS-ben.');
}
publicCss = publicCss.trimEnd() + migratedBlock + '\n';

const testBlock = `\n\ntest('a főoldali kupon banner végleges CSS-e a publikus komponensrétegben él', async ({ page }) => {\n    const root = path.resolve(__dirname, '..');\n    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');\n    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');\n\n    expect(publicCss).toContain('Coupon — végleges megjelenés (99-ből migrálva)');\n    expect(publicCss).toContain('.fooldal .akcios-banner {');\n    expect(publicCss).toContain('.fooldal .akcios-banner-belso {');\n    expect(unifiedCss).not.toContain('/* Coupon */');\n    expect(unifiedCss).not.toContain('.fooldal .akcios-banner-kupon {');\n\n    await page.setViewportSize({ width: 1440, height: 900 });\n    await page.goto('/', { waitUntil: 'domcontentloaded' });\n    const desktop = await page.evaluate(() => {\n        const banner = document.querySelector('.fooldal .akcios-banner');\n        const slider = document.querySelector('.fooldal .akcios-banner-slider');\n        const title = document.querySelector('.fooldal .akcios-banner .akcios-banner-cim');\n        const button = document.querySelector('.fooldal .akcios-banner-gomb');\n        if (!banner || !slider || !title || !button) return null;\n        return {\n            bannerWidth: getComputedStyle(banner).width,\n            bannerMarginTop: getComputedStyle(banner).marginTop,\n            sliderRadius: getComputedStyle(slider).borderRadius,\n            sliderBackground: getComputedStyle(slider).backgroundColor,\n            titleFont: getComputedStyle(title).fontFamily,\n            buttonMinWidth: getComputedStyle(button).minWidth\n        };\n    });\n    expect(desktop).toEqual({\n        bannerWidth: '1040px',\n        bannerMarginTop: '78px',\n        sliderRadius: '4px',\n        sliderBackground: 'rgb(145, 118, 110)',\n        titleFont: '\"Cormorant Garamond\", serif',\n        buttonMinWidth: '180px'\n    });\n\n    await page.setViewportSize({ width: 390, height: 844 });\n    await page.goto('/', { waitUntil: 'domcontentloaded' });\n    const mobile = await page.evaluate(() => {\n        const inner = document.querySelector('.fooldal .akcios-banner-belso');\n        const coupon = document.querySelector('.fooldal .akcios-banner-kupon');\n        const button = document.querySelector('.fooldal .akcios-banner-gomb');\n        if (!inner || !coupon || !button) return null;\n        return {\n            columns: getComputedStyle(inner).gridTemplateColumns,\n            paddingLeft: getComputedStyle(inner).paddingLeft,\n            buttonMinWidth: getComputedStyle(button).minWidth,\n            buttonWidth: getComputedStyle(button).width,\n            couponWidth: getComputedStyle(coupon).width\n        };\n    });\n    expect(mobile).not.toBeNull();\n    expect(mobile.paddingLeft).toBe('20px');\n    expect(mobile.buttonMinWidth).toBe('0px');\n    expect(mobile.buttonWidth).toBe(mobile.couponWidth);\n    expect(mobile.columns.split(' ').length).toBe(1);\n});\n`;

if (testSource.includes('a főoldali kupon banner végleges CSS-e')) {
    throw new Error('A Coupon architecture teszt már szerepel.');
}
testSource = testSource.trimEnd() + testBlock + '\n';

if (unifiedCss.includes('/* Coupon */') || unifiedCss.includes('.fooldal .akcios-banner-kupon {')) {
    throw new Error('Coupon végleges szabály maradt a 99-unified-design.css fájlban.');
}

fs.writeFileSync(publicCssPath, publicCss);
fs.writeFileSync(unifiedCssPath, unifiedCss);
fs.writeFileSync(testPath, testSource);

console.log('Kupon banner CSS migráció kész:');
console.log('- végleges desktop + mobil Coupon szabályok: 99 -> 10-public-components.css');
console.log('- css-architecture: forrás- és computed-style regressziós teszt hozzáadva');
console.log('- foglalási kupon és admin CSS nem módosult');
