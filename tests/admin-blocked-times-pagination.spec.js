const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('blocked times reuse the shared paginator and page-size selector', async ({ page }) => {
    const bootstrap = source('src/admin/00-bootstrap-auth-calendar.js');
    const availability = source('src/admin/40-availability-settings.js');
    const html = source('admin/index.html');
    const components = source('src/admin-styles/10-components.css');

    expect(bootstrap).toContain('tiltasOldalMeret: 10');
    expect(bootstrap).toContain("tiltasLapozo: document.getElementById('admin-tiltas-lapozo')");
    expect(html).toContain('id="admin-tiltas-lapozo" class="admin-lapozo admin-lapozo-felso"');
    expect(availability).toContain("oldalmeretGombok(allapot.tiltasOldalMeret, 'tiltas-oldalmeret')");
    expect(availability).toContain('data-tiltas-oldal="elozo"');
    expect(availability).toContain('listaOldalMeret(allapot.tiltasOldalMeret, allapot.tiltasElemek.length)');
    expect(components).toContain('.admin-oldalmeret-select');

    await page.setContent(`<!doctype html><html><head><style>${components}</style></head><body class="admin-body admin-v2"><main id="admin-tartalom"><div class="admin-lapozo"><div class="admin-lapozo-jobb"><label class="admin-oldalmeret admin-pagination-size"><span>Oldalanként</span><select class="admin-oldalmeret-select" aria-label="Oldalanként"><option>10</option><option>20</option><option>Összes</option></select></label></div></div></main></body></html>`);
    const select = page.locator('.admin-oldalmeret-select');
    await expect(select).toBeVisible();
    await expect(select.locator('option')).toHaveCount(3);
});
