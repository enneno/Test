const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('selected days keep title beside first date and split start/end evenly on mobile', async ({ page }) => {
    const html = source('admin/index.html');
    const calendarJs = source('src/admin/00-bootstrap-auth-calendar.js');
    const availability = source('src/admin-styles/70-availability.css');
    const css = [
        '00-foundation.css',
        '10-components.css',
        '70-availability.css'
    ].map(file => source(`src/admin-styles/${file}`)).join('\n');

    expect(html).toContain('class="admin-naptar-kijelolt-lista" aria-label="Kijelölt napok"');
    expect(html).not.toContain('<h3>Kijelölt napok</h3>');
    expect(calendarJs).toContain('datumok.forEach((datum, index) => {');
    expect(calendarJs).toContain('admin-naptar-lista-cim">Kijelölt napok</span>');
    expect(availability).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head>
    <body class="admin-body admin-v2"><main id="admin-tartalom">
      <div style="container-type:inline-size;container-name:admin-workspace;width:390px">
        <div id="admin-idosav-naptar" class="admin-naptar-blokk">
          <div id="admin-naptar-kijelolt-lista" class="admin-naptar-kijelolt-lista" aria-label="Kijelölt napok">
            <div class="admin-naptar-sor">
              <div class="admin-naptar-datum"><span class="admin-naptar-lista-cim">Kijelölt napok</span><span class="admin-naptar-datum-ertek">28/08/26</span></div>
              <label class="admin-mezo">Kezdés<input data-start type="time" value="09:00"></label>
              <label class="admin-mezo">Vége<input data-end type="time" value="18:00"></label>
              <button type="button" class="admin-kis-gomb admin-veszely-gomb admin-naptar-torles-x" data-naptar-torles aria-label="Törlés">×</button>
            </div>
          </div>
        </div>
      </div>
    </main></body></html>`);

    const metrics = await page.evaluate(() => {
        const title = document.querySelector('.admin-naptar-lista-cim').getBoundingClientRect();
        const date = document.querySelector('.admin-naptar-datum-ertek').getBoundingClientRect();
        const start = document.querySelector('[data-start]').getBoundingClientRect();
        const end = document.querySelector('[data-end]').getBoundingClientRect();
        return {
            titleTop: title.top,
            dateTop: date.top,
            startWidth: start.width,
            endWidth: end.width,
            endValue: document.querySelector('[data-end]').value,
            endVisible: end.width >= 120
        };
    });

    expect(Math.abs(metrics.titleTop - metrics.dateTop)).toBeLessThan(2);
    expect(Math.abs(metrics.startWidth - metrics.endWidth)).toBeLessThan(2);
    expect(metrics.endVisible).toBe(true);
    expect(metrics.endValue).toBe('18:00');
});
