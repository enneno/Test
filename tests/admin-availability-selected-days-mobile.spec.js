const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('selected days keep a fixed header and split start/end evenly on mobile', async ({ page }) => {
    const html = source('admin/index.html');
    const calendarJs = source('src/admin/00-bootstrap-auth-calendar.js');
    const availability = source('src/admin-styles/70-availability.css');
    const css = [
        '00-foundation.css',
        '10-components.css',
        '70-availability.css'
    ].map(file => source(`src/admin-styles/${file}`)).join('\n');

    expect(html).toContain('<h3>Kijelölt napok</h3>');
    expect(calendarJs).toContain('datumok.forEach(datum => {');
    expect(calendarJs).not.toContain('admin-naptar-lista-cim');
    expect(availability).toContain('justify-content: space-between;');
    expect(availability).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head>
    <body class="admin-body admin-v2"><main id="admin-tartalom">
      <div style="container-type:inline-size;container-name:admin-workspace;width:390px">
        <div id="admin-idosav-naptar" class="admin-naptar-blokk">
          <div class="admin-naptar-lista-fej">
            <h3>Kijelölt napok</h3>
            <button type="button" id="admin-naptar-kijeloles-torles" class="admin-kis-gomb admin-veszely-gomb">Kijelölés törlése</button>
          </div>
          <div id="admin-naptar-kijelolt-lista" class="admin-naptar-kijelolt-lista" aria-label="Kijelölt napok">
            <div class="admin-naptar-sor">
              <div class="admin-naptar-datum">28/08/26</div>
              <label class="admin-mezo">Kezdés<input data-start type="time" value="09:00"></label>
              <label class="admin-mezo">Vége<input data-end type="time" value="18:00"></label>
              <button type="button" class="admin-kis-gomb admin-veszely-gomb admin-naptar-torles-x" data-naptar-torles aria-label="Törlés">×</button>
            </div>
          </div>
        </div>
      </div>
    </main></body></html>`);

    const metrics = await page.evaluate(() => {
        const title = document.querySelector('.admin-naptar-lista-fej h3').getBoundingClientRect();
        const clear = document.querySelector('#admin-naptar-kijeloles-torles').getBoundingClientRect();
        const start = document.querySelector('[data-start]').getBoundingClientRect();
        const end = document.querySelector('[data-end]').getBoundingClientRect();
        const card = document.querySelector('.admin-naptar-sor').textContent;
        return {
            titleLeft: title.left,
            clearLeft: clear.left,
            startWidth: start.width,
            endWidth: end.width,
            endValue: document.querySelector('[data-end]').value,
            cardContainsTitle: card.includes('Kijelölt napok')
        };
    });

    expect(metrics.titleLeft).toBeLessThan(metrics.clearLeft);
    expect(metrics.cardContainsTitle).toBe(false);
    expect(Math.abs(metrics.startWidth - metrics.endWidth)).toBeLessThan(2);
    expect(metrics.endValue).toBe('18:00');
});
