const fs = require('fs');
const path = require('path');
const { test, expect } = require('playwright/test');

test('a főoldali Szolgáltatások CSS a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const adminCss = fs.readFileSync(path.join(root, 'src', 'styles', '40-admin.css'), 'utf8');

    expect(publicCss).toContain('SZOLGÁLTATÁSOK');
    expect(publicCss).toContain('#szolgaltatasok {');
    expect(publicCss).toContain('.szolgaltatas-lista {');
    expect(adminCss).not.toContain('#szolgaltatasok {');
    expect(adminCss).not.toContain('.szolgaltatas-lista {');
});

test('a külön Galéria oldal végleges layoutja a publikus komponensrétegben él', async () => {
    const root = path.resolve(__dirname, '..');
    const publicCss = fs.readFileSync(path.join(root, 'src', 'styles', '10-public-components.css'), 'utf8');
    const unifiedCss = fs.readFileSync(path.join(root, 'src', 'styles', '99-unified-design.css'), 'utf8');

    expect(publicCss).toContain('GALÉRIA OLDAL');
    expect(publicCss).toContain('column-count: 4');
    expect(publicCss).toContain('column-count: 3');
    expect(publicCss).toContain('column-count: 2');
    expect(unifiedCss).not.toContain('Standalone gallery: CSS columns avoid empty grid holes.');
    expect(unifiedCss).not.toContain('.galeria-racs {');
});
