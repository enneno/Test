const fs = require('fs');
const path = require('path');
const { test, expect } = require('playwright/test');

test('a Weboldal V2 fejléc mindig tartalmaz Tartalom mentése gombot', async () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'admin', '05-admin-workspace-v2.js'),
        'utf8'
    );

    expect(source).toMatch(/szovegek:\s*\{[\s\S]*?save:\s*'Tartalom mentése'[\s\S]*?\}/);
});

test('a Weboldal V2 mentés közvetlenül a CMS mentést használja', async () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'admin', '05-admin-workspace-v2.js'),
        'utf8'
    );

    expect(source).toContain("aktivPanel?.id === 'admin-panel-szovegek'");
    expect(source).toContain("document.getElementById('admin-cms-save')?.click()");
});
