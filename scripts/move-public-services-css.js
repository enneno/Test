'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adminPath = path.join(root, 'src', 'styles', '40-admin.css');
const publicPath = path.join(root, 'src', 'styles', '10-public-components.css');
const testPath = path.join(root, 'tests', 'css-architecture.spec.js');

const servicesMarker = `/* =========================================\n   SZOLGÁLTATÁSOK\n   ========================================= */`;
const adminMarker = `/* =========================================\n   ADMIN KOMPONENSEK\n   ========================================= */`;
const publicInsertMarker = '.arlista-oldal {';

let adminCss = fs.readFileSync(adminPath, 'utf8');
let publicCss = fs.readFileSync(publicPath, 'utf8');

if (publicCss.includes(servicesMarker)) {
    throw new Error('A Szolgáltatások blokk már szerepel a publikus komponens CSS-ben.');
}

const start = adminCss.indexOf(servicesMarker);
const end = adminCss.indexOf(adminMarker, start);
if (start === -1 || end === -1 || end <= start) {
    throw new Error('Nem található egyértelműen a 40-admin.css Szolgáltatások blokkja.');
}

const servicesBlock = adminCss.slice(start, end).trimEnd();
const requiredSelectors = [
    '#szolgaltatasok {',
    '.szolgaltatas-lista {',
    '.szolgaltatas-kartya {',
    '.szolgaltatas-kartya h3 {',
    '.szolgaltatas-kartya p {'
];
for (const selector of requiredSelectors) {
    if (!servicesBlock.includes(selector)) {
        throw new Error(`Hiányzik a költöztetendő blokkból: ${selector}`);
    }
}

adminCss = adminCss.slice(0, start).trimEnd() + '\n\n' + adminCss.slice(end);

const insertAt = publicCss.indexOf(publicInsertMarker);
if (insertAt === -1) {
    throw new Error('Nem található az Árlista blokk beszúrási pontja a 10-public-components.css fájlban.');
}
publicCss = publicCss.slice(0, insertAt)
    + servicesBlock
    + '\n\n'
    + publicCss.slice(insertAt);

if (adminCss.includes(servicesMarker) || adminCss.includes('#szolgaltatasok {')) {
    throw new Error('Publikus Szolgáltatások CSS maradt a 40-admin.css fájlban.');
}
if (!publicCss.includes(servicesMarker) || !publicCss.includes('#szolgaltatasok {')) {
    throw new Error('A Szolgáltatások CSS nem került át a publikus komponensfájlba.');
}

const architectureTest = `const fs = require('fs');\nconst path = require('path');\nconst { test, expect } = require('playwright/test');\n\ntest('a főoldali Szolgáltatások CSS a publikus komponensrétegben él', async () => {\n    const root = path.resolve(__dirname, '..');\n    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');\n    const adminCss = fs.readFileSync(path.join(root, 'src', 'styles', '40-admin.css'), 'utf8');\n\n    expect(publicCss).toContain('SZOLGÁLTATÁSOK');\n    expect(publicCss).toContain('#szolgaltatasok {');\n    expect(publicCss).toContain('.szolgaltatas-lista {');\n    expect(adminCss).not.toContain('#szolgaltatasok {');\n    expect(adminCss).not.toContain('.szolgaltatas-lista {');\n});\n`;

if (fs.existsSync(testPath)) {
    const existing = fs.readFileSync(testPath, 'utf8');
    if (existing !== architectureTest) {
        throw new Error('A tests/css-architecture.spec.js már létezik más tartalommal; nem írtam felül.');
    }
} else {
    fs.writeFileSync(testPath, architectureTest);
}

fs.writeFileSync(adminPath, adminCss);
fs.writeFileSync(publicPath, publicCss);

console.log('Publikus Szolgáltatások CSS költöztetés kész:');
console.log('- 40-admin.css: csak admin felelősség marad ezen a részen');
console.log('- 10-public-components.css: ide került a főoldali Szolgáltatások alapstílusa');
console.log('- css-architecture regressziós teszt létrehozva');
console.log('Következő ellenőrzés: build + főoldali Szolgáltatások vizuális teszt');
