const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicCssPath = path.join(root, 'src', 'styles', '10-public-components.css');
const unifiedCssPath = path.join(root, 'src', 'styles', '99-unified-design.css');
const testPath = path.join(root, 'tests', 'css-architecture.spec.js');

let publicCss = fs.readFileSync(publicCssPath, 'utf8');
let unifiedCss = fs.readFileSync(unifiedCssPath, 'utf8');
let tests = fs.readFileSync(testPath, 'utf8');

const legalMarker = '/* Legal */';
const adminMarker = '/* Admin */';
const galleryMarker = '/* =========================================\n   GALÉRIA OLDAL\n   ========================================= */';

if (publicCss.includes(legalMarker)) {
    throw new Error('A Legal blokk már szerepel a 10-public-components.css fájlban.');
}

const legalStart = unifiedCss.indexOf(legalMarker);
const adminStart = unifiedCss.indexOf(adminMarker, legalStart + legalMarker.length);

if (legalStart === -1 || adminStart === -1 || adminStart <= legalStart) {
    throw new Error('Nem található egyértelmű Legal -> Admin blokk a 99-unified-design.css fájlban.');
}

if (!publicCss.includes(galleryMarker)) {
    throw new Error('Nem található a GALÉRIA OLDAL beszúrási pont a 10-public-components.css fájlban.');
}

const legalBlock = unifiedCss.slice(legalStart, adminStart).trim();

for (const required of [
    '.jogi-fejlec {',
    '.jogi-elrendezes {',
    '.jogi-oldalsav {',
    '.jogi-tartalomjegyzek',
    '@media screen and (max-width: 900px)',
    '@media screen and (max-width: 768px)',
    '@media screen and (max-width: 480px)'
]) {
    if (!legalBlock.includes(required)) {
        throw new Error(`A Legal blokkból hiányzik a várt rész: ${required}`);
    }
}

unifiedCss = `${unifiedCss.slice(0, legalStart).trimEnd()}\n\n${unifiedCss.slice(adminStart).trimStart()}`;
publicCss = publicCss.replace(galleryMarker, `${legalBlock}\n\n${galleryMarker}`);

const testMarker = "test('a jogi oldal végleges CSS-e a publikus komponensrétegben él'";
if (tests.includes(testMarker)) {
    throw new Error('A jogi CSS regressziós teszt már létezik.');
}

const testBlock = `\n\ntest('a jogi oldal végleges CSS-e a publikus komponensrétegben él', async ({ page }) => {\n    const root = path.resolve(__dirname, '..');\n    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');\n    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');\n\n    expect(publicCss).toContain('/* Legal */');\n    expect(publicCss).toContain('.jogi-fejlec {');\n    expect(publicCss).toContain('.jogi-elrendezes {');\n    expect(publicCss).toContain('.jogi-oldalsav {');\n    expect(unifiedCss).not.toContain('/* Legal */');\n\n    await page.setViewportSize({ width: 1440, height: 1000 });\n    await page.goto('/adatkezeles/', { waitUntil: 'domcontentloaded' });\n    const desktop = await page.evaluate(() => ({\n        headerDisplay: getComputedStyle(document.querySelector('.jogi-fejlec')).display,\n        layoutDisplay: getComputedStyle(document.querySelector('.jogi-elrendezes')).display,\n        sidebarPosition: getComputedStyle(document.querySelector('.jogi-oldalsav')).position,\n        borderBottomStyle: getComputedStyle(document.querySelector('.jogi-fejlec')).borderBottomStyle\n    }));\n    expect(desktop).toEqual({\n        headerDisplay: 'grid',\n        layoutDisplay: 'grid',\n        sidebarPosition: 'sticky',\n        borderBottomStyle: 'solid'\n    });\n\n    await page.setViewportSize({ width: 390, height: 844 });\n    await page.goto('/adatkezeles/', { waitUntil: 'domcontentloaded' });\n    expect(await page.locator('.jogi-oldalsav').evaluate(elem => getComputedStyle(elem).position)).toBe('static');\n    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);\n});\n`;

tests = `${tests.trimEnd()}${testBlock}`;

fs.writeFileSync(publicCssPath, publicCss);
fs.writeFileSync(unifiedCssPath, unifiedCss);
fs.writeFileSync(testPath, tests);

const verifyPublic = fs.readFileSync(publicCssPath, 'utf8');
const verifyUnified = fs.readFileSync(unifiedCssPath, 'utf8');
if (!verifyPublic.includes(legalMarker) || verifyUnified.includes(legalMarker)) {
    throw new Error('A Legal blokk migráció utáni ellenőrzése sikertelen.');
}

console.log('Jogi oldal CSS migráció kész:');
console.log('- jogi specifikus desktop + mobil stílusok: 10-public-components.css');
console.log('- 99-unified-design.css: Legal blokk eltávolítva');
console.log('- a foglalással közös alap-szabályokhoz nem nyúlt');
console.log('- forrás- és computed-style regressziós teszt hozzáadva');
