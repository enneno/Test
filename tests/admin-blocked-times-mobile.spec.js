const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('blocked times use shared card typography and keep date/start/end on one mobile row', async ({ page }) => {
    const availability = source('src/admin-styles/70-availability.css');
    const css = [
        '00-foundation.css',
        '10-components.css',
        '70-availability.css'
    ].map(file => source(`src/admin-styles/${file}`)).join('\n');

    expect(availability).not.toContain('#admin-tiltas-lista h3 {');
    expect(availability).not.toContain('#admin-tiltas-lista p {');
    expect(availability).toContain('grid-template-columns: minmax(0, 1.25fr) repeat(2, minmax(0, .75fr));');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head>
    <body class="admin-body admin-v2"><main id="admin-tartalom">
      <div style="container-type:inline-size;container-name:admin-workspace;width:390px">
        <form id="admin-tiltas-form" class="admin-naptar-blokk admin-tiltas-blokk">
          <div class="admin-naptar-tomeges admin-tiltas-sor">
            <label class="admin-mezo" data-field="date">Dátum<input type="date" value="2026-08-28"></label>
            <label class="admin-mezo" data-field="start">Kezdés<input type="time" value="09:00"></label>
            <label class="admin-mezo" data-field="end">Vége<input type="time" value="10:00"></label>
            <label class="admin-mezo admin-mezo-szeles" data-field="note">Név / megjegyzés<input type="text" value="Donát Viktória"></label>
          </div>
        </form>
        <div id="admin-tiltas-lista" class="admin-db-lista">
          <article class="admin-db-kartya"><div class="admin-db-kartya-fej"><div>
            <span class="admin-kartya-tipus">Kézzel felvett idő</span>
            <h3>Donát Viktória</h3><p>17/09/26 16:00 - 18:00</p>
          </div><button class="admin-kis-gomb admin-veszely-gomb">Törlés</button></div></article>
        </div>
        <article class="admin-db-kartya" data-reference><h3>Referencia</h3><p>Referencia sor</p></article>
      </div>
    </main></body></html>`);

    const metrics = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const form = rect('#admin-tiltas-form');
        const date = rect('[data-field="date"]');
        const start = rect('[data-field="start"]');
        const end = rect('[data-field="end"]');
        const note = rect('[data-field="note"]');
        const listH3 = getComputedStyle(document.querySelector('#admin-tiltas-lista h3')).fontSize;
        const refH3 = getComputedStyle(document.querySelector('[data-reference] h3')).fontSize;
        const listP = getComputedStyle(document.querySelector('#admin-tiltas-lista p')).fontSize;
        const refP = getComputedStyle(document.querySelector('[data-reference] p')).fontSize;
        return {
            dateTop: date.top,
            startTop: start.top,
            endTop: end.top,
            noteTop: note.top,
            formRight: form.right,
            endRight: end.right,
            dateWidth: date.width,
            startWidth: start.width,
            endWidth: end.width,
            listH3,
            refH3,
            listP,
            refP
        };
    });

    expect(Math.abs(metrics.dateTop - metrics.startTop)).toBeLessThan(2);
    expect(Math.abs(metrics.startTop - metrics.endTop)).toBeLessThan(2);
    expect(metrics.noteTop).toBeGreaterThan(metrics.dateTop + 20);
    expect(metrics.endRight).toBeLessThanOrEqual(metrics.formRight + 1);
    expect(metrics.dateWidth).toBeGreaterThan(metrics.startWidth);
    expect(Math.abs(metrics.startWidth - metrics.endWidth)).toBeLessThan(2);
    expect(metrics.listH3).toBe(metrics.refH3);
    expect(metrics.listP).toBe(metrics.refP);
});
