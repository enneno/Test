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

function removeStandaloneLegacyRules(source) {
    const rulePattern = /(^|\n)([^\n{}]*admin-lebego-mentes[^{}]*)\{([^{}]*)\}/g;
    let removed = 0;

    const result = source.replace(rulePattern, (full, prefix, rawSelector) => {
        const selector = rawSelector.trim();
        const allowed = [
            '.admin-lebego-mentes',
            '.admin-lebego-mentes[hidden]',
            '.admin-body .admin-lebego-mentes',
            '.admin-body .admin-lebego-mentes[hidden]'
        ];

        if (!allowed.includes(selector)) {
            throw new Error(`Nem biztonságosan törölhető közös selector: ${selector}`);
        }

        removed += 1;
        return prefix;
    });

    if (removed === 0) {
        throw new Error('Nem találtam törölhető admin-lebego-mentes CSS szabályt.');
    }

    return { source: result, removed };
}

let publicCss = fs.readFileSync(publicCssPath, 'utf8');
let testSource = fs.readFileSync(testPath, 'utf8');

const cleanup = removeStandaloneLegacyRules(publicCss);
publicCss = cleanup.source.replace(/\n{3,}/g, '\n\n');

if (!testSource.includes("'src/styles/10-public-components.css'")) {
    testSource = replaceOnce(
        testSource,
        "        'src/styles/40-admin.css',\n",
        "        'src/styles/10-public-components.css',\n        'src/styles/40-admin.css',\n",
        'admin V2 regressziós CSS fájllista'
    );
}

if (publicCss.includes('admin-lebego-mentes')) {
    const index = publicCss.indexOf('admin-lebego-mentes');
    const context = publicCss.slice(Math.max(0, index - 160), index + 240);
    throw new Error(`A 10-public-components.css fájlban maradt admin-lebego-mentes hivatkozás:\n${context}`);
}
if (!testSource.includes("'src/styles/10-public-components.css'")) {
    throw new Error('A regressziós teszt nem ellenőrzi a publikus komponens CSS-t.');
}

fs.writeFileSync(publicCssPath, publicCss);
fs.writeFileSync(testPath, testSource);

console.log('Régi admin Mentés gomb CSS-maradék takarítás kész:');
console.log(`- 10-public-components.css: ${cleanup.removed} holt admin-lebego-mentes szabály eltávolítva`);
console.log('- regressziós teszt: a publikus komponens CSS-t is ellenőrzi');
console.log('- a működő V2 mentési utakhoz nem nyúlt');
