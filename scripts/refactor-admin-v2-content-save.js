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

const oldSaveHandler = `            if (event.target.closest('[data-admin-v2-save]')) {\n                adminElemek().lebegoMentes?.click();\n                return;\n            }`;

const newSaveHandler = `            if (event.target.closest('[data-admin-v2-save]')) {\n                const aktivPanel = event.target.closest('.admin-db-panel');\n                if (aktivPanel?.id === 'admin-panel-szovegek') {\n                    document.getElementById('admin-cms-save')?.click();\n                    return;\n                }\n                adminElemek().lebegoMentes?.click();\n                return;\n            }`;

adminSource = replaceOnce(
    adminSource,
    oldSaveHandler,
    newSaveHandler,
    'V2 mentés eseménykezelő'
);

const regressionTest = `\n\ntest('a Weboldal V2 mentés közvetlenül a CMS mentést használja', async () => {\n    const source = fs.readFileSync(\n        path.resolve(__dirname, '..', 'src', 'admin', '05-admin-workspace-v2.js'),\n        'utf8'\n    );\n\n    expect(source).toContain("aktivPanel?.id === 'admin-panel-szovegek'");\n    expect(source).toContain("document.getElementById('admin-cms-save')?.click()");\n});\n`;

if (testSource.includes("a Weboldal V2 mentés közvetlenül a CMS mentést használja")) {
    throw new Error('A regressziós teszt már létezik; a script nem módosított semmit.');
}

testSource = testSource.trimEnd() + regressionTest;

if (!adminSource.includes("document.getElementById('admin-cms-save')?.click()")) {
    throw new Error('A közvetlen CMS mentési út nem került be.');
}
if (!adminSource.includes('adminElemek().lebegoMentes?.click()')) {
    throw new Error('A többi panel kompatibilitási mentési útja véletlenül eltűnt.');
}

fs.writeFileSync(adminPath, adminSource);
fs.writeFileSync(testPath, testSource);

console.log('Admin V2 Tartalom mentés refaktor kész:');
console.log('- Weboldal panel: közvetlen #admin-cms-save');
console.log('- többi panel: meglévő kompatibilitási mentés változatlan');
console.log('- regressziós teszt hozzáadva');
console.log('Következő ellenőrzés: npx playwright test tests/admin-v2-regressions.spec.js');
