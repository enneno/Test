'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicPath = path.join(root, 'src', 'styles', '10-public-components.css');
const unifiedPath = path.join(root, 'src', 'styles', '99-unified-design.css');
const testPath = path.join(root, 'tests', 'css-architecture.spec.js');

let publicCss = fs.readFileSync(publicPath, 'utf8');
let unifiedCss = fs.readFileSync(unifiedPath, 'utf8');
let testSource = fs.readFileSync(testPath, 'utf8');

const migrationMarker = '/* Footer — végleges megjelenés (99-ből migrálva) */';
if (publicCss.includes(migrationMarker)) {
    throw new Error('A footer CSS migráció már lefutott; nem történt módosítás.');
}

const footerStart = unifiedCss.indexOf('/* Footer */');
const footerEnd = unifiedCss.indexOf('/* Shared inner pages */', footerStart);
if (footerStart === -1 || footerEnd === -1 || footerEnd <= footerStart) {
    throw new Error('Nem található egyértelműen a 99-es Footer blokk.');
}

const footerBlock = unifiedCss.slice(footerStart, footerEnd).trim();
if (!footerBlock.includes('.site-footer,') || !footerBlock.includes('.footer-belso')) {
    throw new Error('A talált Footer blokk nem tartalmazza a várt szelektorokat.');
}

unifiedCss = unifiedCss.slice(0, footerStart) + unifiedCss.slice(footerEnd);

const mobileFooterBlock = `    .site-footer,\n    .fooldal .site-footer {\n        padding: 20px 20px calc(22px + env(safe-area-inset-bottom));\n    }`;
const mobileIndex = unifiedCss.indexOf(mobileFooterBlock);
if (mobileIndex === -1) {
    throw new Error('Nem található a várt mobil Footer padding override a 99-es fájlban.');
}
if (unifiedCss.indexOf(mobileFooterBlock, mobileIndex + mobileFooterBlock.length) !== -1) {
    throw new Error('A mobil Footer padding override többször szerepel; kézi ellenőrzés szükséges.');
}
unifiedCss = unifiedCss.slice(0, mobileIndex) + unifiedCss.slice(mobileIndex + mobileFooterBlock.length);

const migratedFooter = footerBlock.replace('/* Footer */', migrationMarker);
const mobileFooter = `@media screen and (max-width: 768px) {\n${mobileFooterBlock}\n}`;
publicCss = publicCss.trimEnd() + `\n\n${migratedFooter}\n\n${mobileFooter}\n`;

const architectureTestName = 'a lábléc végleges CSS-e a publikus komponensrétegben él';
if (testSource.includes(architectureTestName)) {
    throw new Error('A footer architektúra teszt már létezik.');
}

testSource = testSource.trimEnd() + `\n\ntest('${architectureTestName}', async ({ page }) => {\n    const root = path.resolve(__dirname, '..');\n    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');\n    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');\n\n    expect(publicCss).toContain('Footer — végleges megjelenés (99-ből migrálva)');\n    expect(publicCss).toContain('.site-footer,');\n    expect(publicCss).toContain('padding: 20px 20px calc(22px + env(safe-area-inset-bottom));');\n    expect(unifiedCss).not.toContain('/* Footer */');\n    expect(unifiedCss).not.toContain('padding: 20px 20px calc(22px + env(safe-area-inset-bottom));');\n\n    await page.setViewportSize({ width: 1440, height: 900 });\n    await page.goto('/', { waitUntil: 'domcontentloaded' });\n    const desktop = await page.locator('.site-footer').evaluate((footer) => {\n        const style = getComputedStyle(footer);\n        return {\n            background: style.backgroundColor,\n            paddingTop: style.paddingTop,\n            maxWidth: style.maxWidth\n        };\n    });\n    expect(desktop).toEqual({\n        background: 'rgb(145, 118, 110)',\n        paddingTop: '40px',\n        maxWidth: 'none'\n    });\n\n    await page.setViewportSize({ width: 390, height: 844 });\n    await page.goto('/', { waitUntil: 'domcontentloaded' });\n    const mobile = await page.locator('.site-footer').evaluate((footer) => {\n        const style = getComputedStyle(footer);\n        return {\n            paddingTop: style.paddingTop,\n            paddingRight: style.paddingRight,\n            paddingBottom: style.paddingBottom,\n            paddingLeft: style.paddingLeft\n        };\n    });\n    expect(mobile).toEqual({\n        paddingTop: '20px',\n        paddingRight: '20px',\n        paddingBottom: '22px',\n        paddingLeft: '20px'\n    });\n});\n`;

if (unifiedCss.includes('/* Footer */')) {
    throw new Error('A Footer blokk bent maradt a 99-es fájlban.');
}
if (unifiedCss.includes(mobileFooterBlock)) {
    throw new Error('A mobil Footer override bent maradt a 99-es fájlban.');
}

fs.writeFileSync(publicPath, publicCss);
fs.writeFileSync(unifiedPath, unifiedCss);
fs.writeFileSync(testPath, testSource);

console.log('Footer CSS migráció kész:');
console.log('- végleges footer megjelenés: 10-public-components.css');
console.log('- desktop + mobil override eltávolítva a 99-unified-design.css-ből');
console.log('- forrás- és computed-style regressziós teszt hozzáadva');
