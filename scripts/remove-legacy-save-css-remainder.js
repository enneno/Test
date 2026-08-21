'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicCssPath = path.join(root, 'src', 'styles', '10-public-components.css');
const testPath = path.join(root, 'tests', 'admin-v2-regressions.spec.js');

function replaceOnce(source, before, after, label) {
    const first = source.indexOf(before);
    if (first === -1) throw new Error(`Nem található a várt rész: ${label}`);
    if (source.indexOf(before, first + before.length) !== -1) {
        throw new Error(`Többször szerepel a várt rész: ${label}`);
    }
    return source.slice(0, first) + after + source.slice(first + before.length);
}

let publicCss = fs.readFileSync(publicCssPath, 'utf8');
let testSource = fs.readFileSync(testPath, 'utf8');

const legacySaveCss = `.admin-lebego-mentes {
    position: fixed;
    right: 24px;
    bottom: calc(24px + env(safe-area-inset-bottom));
    z-index: 1100;
    min-height: 48px;
    padding: 0 28px;
    color: #fffaf4;
    background: var(--akcentus);
    border: 1px solid rgba(255, 250, 244, 0.36);
    border-radius: var(--lumi-radius-pill);
    box-shadow: 0 10px 24px rgba(78, 54, 48, 0.18);
    font-family: 'Manrope', sans-serif;
    font-size: var(--lumi-font-button);
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
}

.admin-lebego-mentes[hidden] {
    display: none;
}

`;

publicCss = replaceOnce(
    publicCss,
    legacySaveCss,
    '',
    '10-public-components.css régi admin Mentés gomb CSS'
);

testSource = replaceOnce(
    testSource,
    "        'src/styles/40-admin.css',\n",
    "        'src/styles/10-public-components.css',\n        'src/styles/40-admin.css',\n",
    'admin V2 regressziós CSS fájllista'
);

if (publicCss.includes('admin-lebego-mentes')) {
    throw new Error('A 10-public-components.css fájlban maradt admin-lebego-mentes hivatkozás.');
}
if (!testSource.includes("'src/styles/10-public-components.css'")) {
    throw new Error('A regressziós teszt nem ellenőrzi a publikus komponens CSS-t.');
}

fs.writeFileSync(publicCssPath, publicCss);
fs.writeFileSync(testPath, testSource);

console.log('Régi admin Mentés gomb CSS-maradék takarítás kész:');
console.log('- 10-public-components.css: holt admin-lebego-mentes szabályok eltávolítva');
console.log('- regressziós teszt: a publikus komponens CSS-t is ellenőrzi');
console.log('- a működő V2 mentési utakhoz nem nyúlt');
