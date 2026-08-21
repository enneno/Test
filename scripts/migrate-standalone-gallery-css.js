'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicPath = path.join(root, 'src', 'styles', '10-public-components.css');
const unifiedPath = path.join(root, 'src', 'styles', '99-unified-design.css');
const testPath = path.join(root, 'tests', 'css-architecture.spec.js');

function replaceOnce(source, before, after, label) {
    const first = source.indexOf(before);
    if (first === -1) throw new Error(`Nem található a várt rész: ${label}`);
    if (source.indexOf(before, first + before.length) !== -1) {
        throw new Error(`Többször szerepel a várt rész: ${label}`);
    }
    return source.slice(0, first) + after + source.slice(first + before.length);
}

let publicCss = fs.readFileSync(publicPath, 'utf8');
let unifiedCss = fs.readFileSync(unifiedPath, 'utf8');
let tests = fs.readFileSync(testPath, 'utf8');

const oldPublicGallery = `.galeria-oldal {\n    padding-top: 24px;\n}\n\n\n.galeria-oldal .szekcio-leiras {\n    margin-bottom: 34px;\n}\n\n.galeria-racs {\n    display: grid;\n    grid-template-columns: repeat(4, 1fr);\n    grid-auto-rows: 190px;\n    gap: 16px;\n    max-width: 1180px;\n    margin: 0 auto 40px;\n}\n\n.galeria-kep-gomb {\n    display: block;\n    width: 100%;\n    height: 100%;\n    padding: 0;\n    overflow: hidden;\n    border: 1px solid rgba(185, 133, 143, 0.18);\n    border-radius: 20px;\n    background: var(--kartya);\n    box-shadow: 0 16px 34px rgba(78, 54, 48, 0.08);\n    cursor: pointer;\n    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;\n}\n\n.galeria-kep-gomb:hover {\n    border-color: rgba(185, 133, 143, 0.38);\n    box-shadow: 0 22px 46px rgba(78, 54, 48, 0.13);\n    transform: translateY(-3px);\n}\n\n.galeria-kep-gomb.magas {\n    grid-row: span 2;\n}\n\n.galeria-kep-gomb img {\n    display: block;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    transition: transform 0.35s ease;\n}\n\n.galeria-kep-gomb:hover img {\n    transform: scale(1.035);\n}\n\n`;

const canonicalGallery = `/* =========================================\n   GALÉRIA OLDAL\n   ========================================= */\n.galeria-oldal {\n    width: min(1360px, calc(100% - 32px));\n    margin: 0 auto;\n    padding: clamp(72px, 8vw, 116px) 0 0;\n}\n\n.galeria-oldal > h1 {\n    margin: 0;\n    color: var(--ui-ink);\n    font-family: \"Cormorant Garamond\", serif;\n    font-size: clamp(68px, 9vw, 116px);\n    font-weight: 600;\n    letter-spacing: -0.045em;\n    line-height: 0.9;\n    text-align: left;\n}\n\n.galeria-oldal > .szekcio-leiras {\n    max-width: 620px;\n    margin: 24px 0 0;\n    color: var(--ui-muted);\n    font-size: var(--lumi-font-body);\n    line-height: 1.75;\n    text-align: left;\n}\n\n.galeria-racs {\n    display: block;\n    max-width: none;\n    margin: 66px 0 0;\n    column-count: 4;\n    column-gap: 10px;\n}\n\n.galeria-kep-gomb,\n.galeria-kep-gomb.magas {\n    display: block;\n    width: 100%;\n    height: auto;\n    margin: 0 0 10px;\n    padding: 0;\n    overflow: hidden;\n    break-inside: avoid;\n    border: 0;\n    border-radius: 3px;\n    background: var(--ui-soft);\n    box-shadow: none;\n    cursor: pointer;\n}\n\n.galeria-kep-gomb img {\n    display: block;\n    width: 100%;\n    height: auto;\n    aspect-ratio: auto;\n    object-fit: contain;\n    transform: none;\n    transition: none;\n}\n\n.galeria-kep-gomb:hover {\n    transform: none;\n    box-shadow: none;\n}\n\n.galeria-kep-gomb:hover img {\n    transform: none;\n}\n\n@media screen and (max-width: 900px) {\n    .galeria-racs {\n        column-count: 3;\n    }\n}\n\n@media screen and (max-width: 768px) {\n    .galeria-oldal {\n        width: calc(100% - 32px);\n        padding-top: 24px;\n    }\n\n    .galeria-racs {\n        column-count: 2;\n    }\n}\n\n@media screen and (max-width: 480px) {\n    .galeria-racs {\n        column-gap: 7px;\n    }\n\n    .galeria-kep-gomb,\n    .galeria-kep-gomb.magas {\n        margin-bottom: 7px;\n    }\n}\n\n`;

publicCss = replaceOnce(publicCss, oldPublicGallery, canonicalGallery, 'régi publikus galéria grid');

unifiedCss = replaceOnce(
    unifiedCss,
    `.galeria-oldal,\n.foglalas-oldal,\n.jogi-oldal {`,
    `.foglalas-oldal,\n.jogi-oldal {`,
    'megosztott belső oldal konténer'
);
unifiedCss = replaceOnce(
    unifiedCss,
    `.galeria-oldal > h1,\n.jogi-fejlec h1 {`,
    `.jogi-fejlec h1 {`,
    'megosztott belső oldal főcím'
);
unifiedCss = replaceOnce(
    unifiedCss,
    `.galeria-oldal > .szekcio-leiras,\n.jogi-fejlec > p {`,
    `.jogi-fejlec > p {`,
    'megosztott belső oldal leírás'
);

const oldUnifiedGallery = `/* Standalone gallery: CSS columns avoid empty grid holes. */\n.galeria-oldal {\n    width: min(1360px, calc(100% - 32px));\n}\n\n.galeria-racs {\n    display: block;\n    max-width: none;\n    margin: 66px 0 0;\n    column-count: 4;\n    column-gap: 10px;\n}\n\n.galeria-kep-gomb,\n.galeria-kep-gomb.magas {\n    display: block;\n    width: 100%;\n    height: auto;\n    margin: 0 0 10px;\n    overflow: hidden;\n    break-inside: avoid;\n    border: 0;\n    border-radius: 3px;\n    background: var(--ui-soft);\n    box-shadow: none;\n}\n\n.galeria-kep-gomb img {\n    display: block;\n    width: 100%;\n    height: auto;\n    aspect-ratio: auto;\n    object-fit: contain;\n    transform: none;\n    transition: none;\n}\n\n.galeria-kep-gomb:hover {\n    transform: none;\n    box-shadow: none;\n}\n\n.galeria-kep-gomb:hover img {\n    transform: none;\n}\n\n`;
unifiedCss = replaceOnce(unifiedCss, oldUnifiedGallery, '', '99 standalone galéria blokk');

unifiedCss = replaceOnce(
    unifiedCss,
    `    .galeria-racs {\n        column-count: 3;\n    }\n\n`,
    '',
    '99 galéria 900px oszlopszám'
);
unifiedCss = replaceOnce(
    unifiedCss,
    `    .galeria-oldal,\n    .foglalas-oldal,\n    .jogi-oldal,\n    .admin-oldal {`,
    `    .foglalas-oldal,\n    .jogi-oldal,\n    .admin-oldal {`,
    '99 mobil megosztott konténer'
);
unifiedCss = replaceOnce(
    unifiedCss,
    `    .galeria-racs {\n        column-count: 2;\n    }\n\n`,
    '',
    '99 galéria 768px oszlopszám'
);
unifiedCss = replaceOnce(
    unifiedCss,
    `    .galeria-racs {\n        column-gap: 7px;\n    }\n\n    .galeria-kep-gomb,\n    .galeria-kep-gomb.magas {\n        margin-bottom: 7px;\n    }\n\n`,
    '',
    '99 galéria 480px térköz'
);

const regression = `\n\ntest('a külön Galéria oldal végleges layoutja a publikus komponensrétegben él', async () => {\n    const root = path.resolve(__dirname, '..');\n    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');\n    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');\n\n    expect(publicCss).toContain('GALÉRIA OLDAL');\n    expect(publicCss).toContain('column-count: 4');\n    expect(publicCss).toContain('column-count: 3');\n    expect(publicCss).toContain('column-count: 2');\n    expect(unifiedCss).not.toContain('Standalone gallery: CSS columns avoid empty grid holes.');\n    expect(unifiedCss).not.toContain('.galeria-racs {');\n});\n`;

if (tests.includes("a külön Galéria oldal végleges layoutja a publikus komponensrétegben él")) {
    throw new Error('A galéria CSS regressziós teszt már létezik.');
}
tests = tests.trimEnd() + regression;

if (unifiedCss.includes('Standalone gallery: CSS columns avoid empty grid holes.')) {
    throw new Error('A 99 galéria blokk nem tűnt el.');
}
if (unifiedCss.includes('.galeria-racs {')) {
    throw new Error('A 99-ben még maradt .galeria-racs szabály.');
}
if (!publicCss.includes('column-count: 4') || !publicCss.includes('GALÉRIA OLDAL')) {
    throw new Error('A végleges Galéria layout nem került a publikus komponensrétegbe.');
}

fs.writeFileSync(publicPath, publicCss);
fs.writeFileSync(unifiedPath, unifiedCss);
fs.writeFileSync(testPath, tests);

console.log('Külön Galéria oldal CSS migráció kész:');
console.log('- végleges layout: 10-public-components.css');
console.log('- 99-unified-design.css: galéria layout override eltávolítva');
console.log('- desktop/tablet/mobil oszlopszám megőrizve: 4 / 3 / 2');
console.log('- regressziós teszt hozzáadva');
