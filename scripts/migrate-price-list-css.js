'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicPath = path.join(root, 'src', 'styles', '10-public-components.css');
const unifiedPath = path.join(root, 'src', 'styles', '99-unified-design.css');

function replaceOnce(source, before, after, label) {
    const first = source.indexOf(before);
    if (first === -1) throw new Error(`Nem található a várt CSS-rész: ${label}`);
    if (source.indexOf(before, first + before.length) !== -1) {
        throw new Error(`Többször szerepel a várt CSS-rész: ${label}`);
    }
    return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceRange(source, startMarker, endMarker, replacement, label) {
    const start = source.indexOf(startMarker);
    if (start === -1) throw new Error(`Nem található a kezdő marker: ${label}`);
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end === -1) throw new Error(`Nem található a záró marker: ${label}`);
    if (source.indexOf(startMarker, start + startMarker.length) !== -1) {
        throw new Error(`Többször szerepel a kezdő marker: ${label}`);
    }
    return source.slice(0, start) + replacement + source.slice(end);
}

const canonicalPriceList = `.arlista-oldal {
    width: min(960px, calc(100% - 48px));
    margin: 0 auto;
    padding: clamp(72px, 8vw, 116px) 0 0;
}

.arlista-oldal > h1 {
    margin: 0;
    color: var(--ui-ink);
    font-family: "Cormorant Garamond", serif;
    font-size: clamp(68px, 9vw, 116px);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 0.9;
    text-align: center;
}

.arlista-oldal > .szekcio-leiras {
    max-width: 620px;
    margin: 24px auto 0;
    color: var(--ui-muted);
    font-size: var(--lumi-font-body);
    line-height: 1.75;
    text-align: center;
}

.arlista-panel {
    max-width: none;
    margin: 70px 0 0;
    padding: 0;
    border: 0;
    border-top: 1px solid var(--ui-line-strong);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
}

.arlista-ket-oszlop {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 76px;
}

.arlista-csoport,
.arlista-ket-oszlop .arlista-csoport {
    margin: 0;
    padding: 38px 0 30px;
    border-bottom: 1px solid var(--ui-line);
}

.arlista-csoport h3 {
    margin: 0 0 24px;
    color: var(--ui-rose-dark);
    font-family: "Manrope", sans-serif;
    font-size: var(--lumi-font-caption);
    font-weight: 750;
    letter-spacing: 0.18em;
    line-height: 1;
    text-align: left;
    text-transform: uppercase;
}

.arlista-sor {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-height: 50px;
    padding: 8px 0;
    color: var(--ui-ink);
    font-family: "Manrope", sans-serif;
    font-size: 18px;
    line-height: 1.45;
}

.arlista-sor::before {
    content: "";
    flex: 1 1 auto;
    min-width: 18px;
    order: 2;
    margin-top: 0;
    border-bottom: 1px dotted rgba(67, 49, 43, 0.38);
}

.arlista-sor > span {
    min-width: 0;
    order: 1;
}

.arlista-sor strong {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    order: 3;
    color: var(--ui-ink);
    font-weight: 750;
    line-height: 1.1;
    white-space: nowrap;
}

.arlista-ido {
    color: var(--ui-muted);
    font-family: 'Manrope', sans-serif;
    font-size: var(--lumi-font-caption);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.arlista-megjegyzes {
    margin: 32px 0 0;
    padding: 18px 20px;
    border-left: 2px solid var(--ui-rose);
    background: rgba(255, 253, 249, 0.7);
    color: var(--ui-muted);
    font-size: var(--lumi-font-body-small);
    font-style: normal;
    text-align: left;
}

.arlista-ervenyesseg {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin: 20px 0 0;
    color: var(--ui-muted);
    font-size: var(--lumi-font-caption);
    font-weight: 650;
    letter-spacing: 0.06em;
    line-height: 1.5;
}

.arlista-ervenyesseg[hidden] {
    display: none;
}

.arlista-ervenyesseg::before {
    content: '';
    width: 42px;
    height: 1px;
    background: var(--ui-line-strong);
}

@media screen and (max-width: 640px) {
    .arlista-ervenyesseg {
        justify-content: center;
        text-align: center;
    }

    .arlista-ervenyesseg::before {
        width: 24px;
    }
}

@media screen and (max-width: 480px) {
    .arlista-sor {
        gap: 7px;
        font-size: var(--lumi-font-body);
    }

    .arlista-sor::before {
        min-width: 10px;
    }
}

`;

const canonicalMobilePriceList = `    .arlista-oldal {
        width: calc(100% - 32px);
        padding-top: 24px;
    }

    .arlista-ket-oszlop {
        grid-template-columns: 1fr;
    }

`;

let publicCss = fs.readFileSync(publicPath, 'utf8');
let unifiedCss = fs.readFileSync(unifiedPath, 'utf8');

publicCss = replaceRange(
    publicCss,
    '.arlista-oldal {\n    padding-top: 24px;\n}',
    '.galeria-oldal {\n    padding-top: 24px;\n}',
    canonicalPriceList,
    '10-public-components desktop Árlista'
);

publicCss = replaceRange(
    publicCss,
    '    .arlista-oldal {\n        padding-top: 12px;\n    }',
    '    .galeria-oldal {\n        padding-top: 12px;\n    }',
    canonicalMobilePriceList,
    '10-public-components mobil Árlista'
);

unifiedCss = replaceOnce(
    unifiedCss,
    '.arlista-oldal,\n.galeria-oldal,\n.foglalas-oldal,\n.jogi-oldal {',
    '.galeria-oldal,\n.foglalas-oldal,\n.jogi-oldal {',
    '99 közös belsőoldal konténer'
);

unifiedCss = replaceOnce(
    unifiedCss,
    '.arlista-oldal > h1,\n.galeria-oldal > h1,\n.jogi-fejlec h1 {',
    '.galeria-oldal > h1,\n.jogi-fejlec h1 {',
    '99 közös belsőoldal főcím'
);

unifiedCss = replaceOnce(
    unifiedCss,
    '.arlista-oldal > .szekcio-leiras,\n.galeria-oldal > .szekcio-leiras,\n.jogi-fejlec > p {',
    '.galeria-oldal > .szekcio-leiras,\n.jogi-fejlec > p {',
    '99 közös belsőoldal leírás'
);

unifiedCss = replaceRange(
    unifiedCss,
    '/* Price list */\n',
    '/* Standalone gallery: CSS columns avoid empty grid holes. */',
    '',
    '99 Price list blokk'
);

unifiedCss = replaceOnce(
    unifiedCss,
    '    .arlista-oldal,\n    .galeria-oldal,\n    .foglalas-oldal,\n    .jogi-oldal,\n    .admin-oldal {',
    '    .galeria-oldal,\n    .foglalas-oldal,\n    .jogi-oldal,\n    .admin-oldal {',
    '99 mobil belsőoldal konténer'
);

unifiedCss = replaceOnce(
    unifiedCss,
    '    .arlista-ket-oszlop {\n        grid-template-columns: 1fr;\n    }\n\n',
    '',
    '99 mobil Árlista oszlop'
);

unifiedCss = replaceOnce(
    unifiedCss,
    '    .arlista-sor {\n        gap: 7px;\n        font-size: var(--lumi-font-body);\n    }\n\n    .arlista-sor::before {\n        min-width: 10px;\n    }\n\n',
    '',
    '99 telefonos Árlista sor'
);

if (unifiedCss.includes('/* Price list */')) {
    throw new Error('A 99 Price list blokk nem került teljesen eltávolításra.');
}
if (!publicCss.includes('.arlista-ervenyesseg')) {
    throw new Error('Az Árlista érvényességi stílusa nem került át a publikus komponensfájlba.');
}

fs.writeFileSync(publicPath, publicCss);
fs.writeFileSync(unifiedPath, unifiedCss);

console.log('Árlista CSS migráció kész:');
console.log('- végleges Árlista szabályok: src/styles/10-public-components.css');
console.log('- Árlista override-ok eltávolítva: src/styles/99-unified-design.css');
console.log('Következő ellenőrzés: npm run verify');
