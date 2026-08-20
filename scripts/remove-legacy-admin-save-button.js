'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const paths = {
    html: path.join(root, 'admin', 'index.html'),
    bootstrap: path.join(root, 'src', 'admin', '00-bootstrap-auth-calendar.js'),
    content: path.join(root, 'admin-content.js'),
    v2Css: path.join(root, 'src', 'admin-styles', 'admin-workspace-v2.css'),
    adminCss: path.join(root, 'src', 'styles', '40-admin.css'),
    unifiedCss: path.join(root, 'src', 'styles', '99-unified-design.css'),
    tests: path.join(root, 'tests', 'admin-v2-regressions.spec.js')
};

function replaceOnce(source, before, after, label) {
    const first = source.indexOf(before);
    if (first === -1) throw new Error(`Nem található a várt rész: ${label}`);
    if (source.indexOf(before, first + before.length) !== -1) {
        throw new Error(`Többször szerepel a várt rész: ${label}`);
    }
    return source.slice(0, first) + after + source.slice(first + before.length);
}

function removeExactCssBlocks(source, selector, expectedCount, label) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\n?${escaped}\\s*\\{[^{}]*\\}\\n?`, 'g');
    const matches = source.match(re) || [];
    if (matches.length !== expectedCount) {
        throw new Error(`${label}: ${expectedCount} CSS blokk helyett ${matches.length} található.`);
    }
    return source.replace(re, '\n');
}

let html = fs.readFileSync(paths.html, 'utf8');
let bootstrap = fs.readFileSync(paths.bootstrap, 'utf8');
let content = fs.readFileSync(paths.content, 'utf8');
let v2Css = fs.readFileSync(paths.v2Css, 'utf8');
let adminCss = fs.readFileSync(paths.adminCss, 'utf8');
let unifiedCss = fs.readFileSync(paths.unifiedCss, 'utf8');
let tests = fs.readFileSync(paths.tests, 'utf8');

html = replaceOnce(
    html,
    '            <button type="button" id="admin-lebego-mentes" class="admin-lebego-mentes" hidden>Mentés</button>\n\n',
    '',
    'régi rejtett Mentés gomb'
);

bootstrap = replaceOnce(
    bootstrap,
    "        elemek.lebegoMentes?.addEventListener('click', lebegoMentes);\n",
    '',
    'régi Mentés gomb eseménykezelő'
);
bootstrap = replaceOnce(
    bootstrap,
    "            lebegoMentes: document.getElementById('admin-lebego-mentes'),\n",
    '',
    'régi Mentés gomb DOM referencia'
);

content = replaceOnce(
    content,
    "        document.getElementById('admin-lebego-mentes')?.addEventListener('click', () => {\n            if (document.getElementById('admin-panel-szovegek')?.classList.contains('aktiv')) saveContent();\n        });\n",
    '',
    'CMS régi Mentés gomb proxy'
);

v2Css = replaceOnce(
    v2Css,
    '.admin-body.admin-v2 .admin-v2-legacy-tabs,\n.admin-body.admin-v2 .admin-lebego-mentes {\n  display: none;\n}',
    '.admin-body.admin-v2 .admin-v2-legacy-tabs {\n  display: none;\n}',
    'V2 rejtett Mentés selector'
);

adminCss = adminCss.replace('/* Admin floating save button top layer 20260719 */\n', '');
adminCss = removeExactCssBlocks(adminCss, '.admin-body .admin-lebego-mentes', 2, '40-admin régi Mentés stílus');
adminCss = removeExactCssBlocks(adminCss, '.admin-body .admin-lebego-mentes[hidden]', 1, '40-admin régi Mentés hidden stílus');

unifiedCss = replaceOnce(
    unifiedCss,
    '.admin-hozzaadas,\n.admin-kis-gomb,\n.admin-gomb,\n.admin-lebego-mentes {',
    '.admin-hozzaadas,\n.admin-kis-gomb,\n.admin-gomb {',
    '99 közös admin gomb selector'
);
unifiedCss = removeExactCssBlocks(unifiedCss, '.admin-body .admin-lebego-mentes', 2, '99 régi Mentés stílus');
unifiedCss = removeExactCssBlocks(unifiedCss, '.admin-body .admin-lebego-mentes:hover', 2, '99 régi Mentés hover stílus');

const regressionTest = `\n\ntest('a régi rejtett admin Mentés gomb teljesen eltűnt a forrásból', async () => {\n    const files = [\n        'admin/index.html',\n        'src/admin/00-bootstrap-auth-calendar.js',\n        'admin-content.js',\n        'src/admin-styles/admin-workspace-v2.css',\n        'src/styles/40-admin.css',\n        'src/styles/99-unified-design.css'\n    ];\n\n    for (const file of files) {\n        const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');\n        expect(source, file).not.toContain('admin-lebego-mentes');\n    }\n});\n`;

if (tests.includes('a régi rejtett admin Mentés gomb teljesen eltűnt a forrásból')) {
    throw new Error('A regressziós teszt már létezik; a script nem módosított semmit.');
}
tests = tests.trimEnd() + regressionTest;

for (const [label, source] of Object.entries({ html, bootstrap, content, v2Css, adminCss, unifiedCss })) {
    if (source.includes('admin-lebego-mentes')) {
        throw new Error(`Maradt admin-lebego-mentes hivatkozás: ${label}`);
    }
}

fs.writeFileSync(paths.html, html);
fs.writeFileSync(paths.bootstrap, bootstrap);
fs.writeFileSync(paths.content, content);
fs.writeFileSync(paths.v2Css, v2Css);
fs.writeFileSync(paths.adminCss, adminCss);
fs.writeFileSync(paths.unifiedCss, unifiedCss);
fs.writeFileSync(paths.tests, tests);

console.log('Régi admin Mentés gomb takarítás kész:');
console.log('- rejtett HTML gomb eltávolítva');
console.log('- régi JS eseménykezelők és DOM referencia eltávolítva');
console.log('- kapcsolódó V2 / 40-admin / 99 CSS eltávolítva');
console.log('- regressziós teszt hozzáadva');
console.log('Következő ellenőrzés: npm run build + célzott admin tesztek');
