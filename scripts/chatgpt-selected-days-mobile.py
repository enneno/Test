from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'admin/index.html',
    '''                        <div class="admin-naptar-lista-fej">\n                            <h3>Kijelölt napok</h3>\n                            <button type="button" id="admin-naptar-kijeloles-torles" class="admin-kis-gomb admin-veszely-gomb">Kijelölés törlése</button>\n                        </div>\n                        <div id="admin-naptar-kijelolt-lista" class="admin-naptar-kijelolt-lista"></div>''',
    '''                        <div class="admin-naptar-lista-fej">\n                            <button type="button" id="admin-naptar-kijeloles-torles" class="admin-kis-gomb admin-veszely-gomb">Kijelölés törlése</button>\n                        </div>\n                        <div id="admin-naptar-kijelolt-lista" class="admin-naptar-kijelolt-lista" aria-label="Kijelölt napok"></div>''',
    'selected list static heading'
)

replace_once(
    'src/admin/00-bootstrap-auth-calendar.js',
    '''        datumok.forEach(datum => {\n            const ertek = allapot.naptarKijelolesek.get(datum) || naptarAlapIdosav();''',
    '''        datumok.forEach((datum, index) => {\n            const ertek = allapot.naptarKijelolesek.get(datum) || naptarAlapIdosav();''',
    'selected list index'
)

replace_once(
    'src/admin/00-bootstrap-auth-calendar.js',
    '''                <div class="admin-naptar-datum">${html(datumRovid(datum))}</div>''',
    '''                <div class="admin-naptar-datum">\n                    ${index === 0 ? '<span class="admin-naptar-lista-cim">Kijelölt napok</span>' : ''}\n                    <span class="admin-naptar-datum-ertek">${html(datumRovid(datum))}</span>\n                </div>''',
    'selected list title beside first date'
)

replace_once(
    'src/admin-styles/70-availability.css',
    '''.admin-body.admin-v2 .admin-naptar-datum {\n  color: var(--barna);\n  font-size: var(--lumi-font-label);\n  font-weight: 600;\n  line-height: 1.25;\n}''',
    '''.admin-body.admin-v2 .admin-naptar-datum {\n  display: flex;\n  min-width: 0;\n  align-items: center;\n  gap: 8px;\n  color: var(--barna);\n  font-size: var(--lumi-font-label);\n  font-weight: 600;\n  line-height: 1.25;\n}\n.admin-body.admin-v2 .admin-naptar-lista-cim {\n  color: var(--tinta);\n  font-size: 14px;\n  font-weight: 600;\n  white-space: nowrap;\n}\n.admin-body.admin-v2 .admin-naptar-datum-ertek { white-space: nowrap; }''',
    'selected date inline title'
)

replace_once(
    'src/admin-styles/70-availability.css',
    '''.admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-lista-fej {\n  grid-area: selected-title;\n  align-items: center;\n  margin: 0;\n  padding-top: 3px;\n}\n.admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-lista-fej h3 {\n  margin: 0;\n  font-size: 22px;\n}''',
    '''.admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-lista-fej {\n  grid-area: selected-title;\n  align-items: center;\n  justify-content: flex-end;\n  margin: 0;\n  padding-top: 3px;\n}''',
    'selected list header ownership'
)

replace_once(
    'src/admin-styles/70-availability.css',
    '''  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-sor {\n    grid-template-columns: minmax(0, 1fr) 34px;\n    grid-template-areas:\n      "date delete"\n      "start end";\n    align-items: end;\n    gap: 7px 8px;\n    padding: 8px;\n  }''',
    '''  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-sor {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    grid-template-areas:\n      "date delete"\n      "start end";\n    align-items: end;\n    gap: 7px 8px;\n    padding: 8px;\n  }\n  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-sor > .admin-mezo {\n    width: 100%;\n    min-width: 0;\n    max-width: none;\n  }\n  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-sor > .admin-mezo > input {\n    width: 100%;\n    min-width: 0;\n  }''',
    'balanced selected day time columns'
)

replace_once(
    'src/admin-styles/70-availability.css',
    '''  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-sor > .admin-naptar-datum {\n    grid-area: date;\n    align-self: center;\n    font-size: 12px;\n  }''',
    '''  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-sor > .admin-naptar-datum {\n    grid-area: date;\n    align-self: center;\n    gap: 6px;\n    font-size: 12px;\n  }\n  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-lista-cim { font-size: 12px; }''',
    'selected title mobile fit'
)

Path('tests/admin-availability-selected-days-mobile.spec.js').write_text(r'''const { test, expect } = require('playwright/test');
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
''', encoding='utf-8')
