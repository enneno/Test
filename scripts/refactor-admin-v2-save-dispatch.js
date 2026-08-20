'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adminPath = path.join(root, 'src', 'admin', '05-admin-workspace-v2.js');
const testPath = path.join(root, 'tests', 'admin-v2-regressions.spec.js');

function replaceOnce(source, before, after, label) {
    const first = source.indexOf(before);
    if (first === -1) throw new Error(`Nem található a várt rész: ${label}`);
    if (source.indexOf(before, first + before.length) !== -1) {
        throw new Error(`Többször szerepel a várt rész: ${label}`);
    }
    return source.slice(0, first) + after + source.slice(first + before.length);
}

let adminSource = fs.readFileSync(adminPath, 'utf8');
let testSource = fs.readFileSync(testPath, 'utf8');

adminSource = replaceOnce(
    adminSource,
    "                adminElemek().lebegoMentes?.click();\n                return;",
    "                lebegoMentes();\n                return;",
    'V2 általános mentési dispatcher'
);

const regressionTest = `\n\ntest('a V2 mentés nem rejtett lebegő gomb kattintását használja', async () => {\n    const source = fs.readFileSync(\n        path.resolve(__dirname, '..', 'src', 'admin', '05-admin-workspace-v2.js'),\n        'utf8'\n    );\n\n    expect(source).toContain('lebegoMentes();');\n    expect(source).not.toContain('adminElemek().lebegoMentes?.click()');\n});\n`;

if (testSource.includes('a V2 mentés nem rejtett lebegő gomb kattintását használja')) {
    throw new Error('A regressziós teszt már létezik; a script nem módosított semmit.');
}

testSource = testSource.trimEnd() + regressionTest;

if (!adminSource.includes("document.getElementById('admin-cms-save')?.click()")) {
    throw new Error('A Weboldal közvetlen CMS mentési útja véletlenül eltűnt.');
}
if (!adminSource.includes('lebegoMentes();')) {
    throw new Error('A közvetlen admin mentési dispatcher nem került be.');
}
if (adminSource.includes('adminElemek().lebegoMentes?.click()')) {
    throw new Error('A V2 továbbra is rejtett mentésgombra kattint.');
}

fs.writeFileSync(adminPath, adminSource);
fs.writeFileSync(testPath, testSource);

console.log('Admin V2 mentési dispatcher refaktor kész:');
console.log('- Weboldal panel: közvetlen #admin-cms-save');
console.log('- többi menthető V2 panel: közvetlen lebegoMentes() dispatcher');
console.log('- rejtett DOM-gomb kattintás eltávolítva a V2-ből');
console.log('- regressziós teszt hozzáadva');
console.log('Következő ellenőrzés: build + admin V2 tesztek');
