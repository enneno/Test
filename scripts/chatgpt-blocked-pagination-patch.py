from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


bootstrap = Path('src/admin/00-bootstrap-auth-calendar.js')
text = bootstrap.read_text(encoding='utf-8')
repls = [
    (
        "        naptarKijelolesek: new Map(),\n        tiltasStatuszTamogatott: true",
        "        naptarKijelolesek: new Map(),\n        tiltasOldal: 1,\n        tiltasOldalMeret: 10,\n        tiltasElemek: [],\n        tiltasStatuszTamogatott: true",
        'blocked pagination state'
    ),
    (
        "        elemek.tiltasLista?.addEventListener('click', tiltasListaKattintas);",
        "        elemek.tiltasLista?.addEventListener('click', tiltasListaKattintas);\n        elemek.tiltasLapozo?.addEventListener('click', tiltasLapozoKattintas);\n        elemek.tiltasLapozo?.addEventListener('change', tiltasLapozoKattintas);",
        'blocked pagination listeners'
    ),
    (
        "            tiltasOk: document.getElementById('admin-tiltas-ok'),\n            tiltasLista: document.getElementById('admin-tiltas-lista'),",
        "            tiltasOk: document.getElementById('admin-tiltas-ok'),\n            tiltasLapozo: document.getElementById('admin-tiltas-lapozo'),\n            tiltasLista: document.getElementById('admin-tiltas-lista'),",
        'blocked pagination element'
    ),
]
for old, new, label in repls:
    if old not in text:
        raise SystemExit(f'{label}: target not found')
    text = text.replace(old, new, 1)
bootstrap.write_text(text, encoding='utf-8')

replace_once(
    'admin/index.html',
    '                    </form>\n                    <div id="admin-tiltas-lista" class="admin-db-lista"></div>',
    '                    </form>\n                    <div id="admin-tiltas-lapozo" class="admin-lapozo admin-lapozo-felso"></div>\n                    <div id="admin-tiltas-lista" class="admin-db-lista"></div>',
    'blocked times paginator markup'
)

availability = Path('src/admin/40-availability-settings.js')
text = availability.read_text(encoding='utf-8')
pattern = re.compile(r"    async function tiltasokBetoltese\(\) \{.*?\n    \}\n\n    function tiltasKartya\(tiltas\) \{", re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('tiltasokBetoltese block not found')

replacement = '''    async function tiltasokBetoltese() {
        let { data, error } = await allapot.kliens
            .from('blocked_times')
            .select('id,starts_at,ends_at,reason,status')
            .order('starts_at', { ascending: false })
            .limit(200);

        if (error && adatbazisOszlopHiany(error, ['status'])) {
            allapot.tiltasStatuszTamogatott = false;
            ({ data, error } = await allapot.kliens
                .from('blocked_times')
                .select('id,starts_at,ends_at,reason')
                .order('starts_at', { ascending: false })
                .limit(200));
        } else if (!error) {
            allapot.tiltasStatuszTamogatott = true;
        }

        if (error) {
            onlineStatusz('Nem sikerült betölteni a foglalt időket.', true);
            return;
        }

        allapot.tiltasElemek = (data || []).map(tiltas => ({
            ...tiltas,
            status: tiltasStatuszErtek(tiltas.status)
        }));

        if (allapot.tiltasOldal > tiltasOsszesOldal()) {
            allapot.tiltasOldal = tiltasOsszesOldal();
        }

        tiltasListaRenderelese();
    }

    function tiltasOsszesOldal() {
        if (allapot.tiltasOldalMeret === 'all') return 1;
        return Math.max(1, Math.ceil(allapot.tiltasElemek.length / listaOldalMeret(allapot.tiltasOldalMeret, allapot.tiltasElemek.length)));
    }

    function tiltasLapozoHtml() {
        const osszes = tiltasOsszesOldal();
        const vanElem = allapot.tiltasElemek.length > 0;
        const oldalSzoveg = vanElem ? `${allapot.tiltasOldal} / ${osszes}` : '0 / 0';
        return `
            <div class="admin-lapozo-nav" role="group" aria-label="Kieső időszakok lapozása">
                <button type="button" class="admin-pagination-button" data-tiltas-oldal="elozo" aria-label="Előző oldal" title="Előző oldal" ${allapot.tiltasOldal <= 1 || !vanElem ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"></path></svg>
                    <span>Előző</span>
                </button>
                <span class="admin-pagination-page" aria-label="${html(oldalSzoveg)}">${html(oldalSzoveg)}</span>
                <button type="button" class="admin-pagination-button" data-tiltas-oldal="kovetkezo" aria-label="Következő oldal" title="Következő oldal" ${allapot.tiltasOldal >= osszes || !vanElem ? 'disabled' : ''}>
                    <span>Következő</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"></path></svg>
                </button>
            </div>
            <div class="admin-lapozo-jobb">
                <label class="admin-oldalmeret admin-pagination-size">
                    <span>Oldalanként</span>
                    ${oldalmeretGombok(allapot.tiltasOldalMeret, 'tiltas-oldalmeret')}
                </label>
            </div>
        `;
    }

    function tiltasLapozoRenderelese() {
        const elemek = adminElemek();
        if (elemek.tiltasLapozo) {
            elemek.tiltasLapozo.innerHTML = tiltasLapozoHtml();
        }
    }

    function tiltasListaRenderelese() {
        const elemek = adminElemek();
        if (!elemek.tiltasLista) return;

        const meret = listaOldalMeret(allapot.tiltasOldalMeret, allapot.tiltasElemek.length);
        const kezd = allapot.tiltasOldalMeret === 'all' ? 0 : (allapot.tiltasOldal - 1) * meret;
        const oldalElemek = allapot.tiltasOldalMeret === 'all'
            ? allapot.tiltasElemek
            : allapot.tiltasElemek.slice(kezd, kezd + meret);

        elemek.tiltasLista.innerHTML = '';

        if (!oldalElemek.length) {
            elemek.tiltasLista.innerHTML = '<p class="admin-ures">Nincs külön felvett foglalt idő.</p>';
            tiltasLapozoRenderelese();
            return;
        }

        oldalElemek.forEach(tiltas => elemek.tiltasLista.appendChild(tiltasKartya(tiltas)));
        tiltasLapozoRenderelese();
    }

    function tiltasLapozoKattintas(event) {
        const meretValaszto = event.target.closest('[data-tiltas-oldalmeret]');
        if (meretValaszto) {
            if (event.type === 'click' && meretValaszto.tagName === 'SELECT') return;
            allapot.tiltasOldalMeret = meretValaszto.value || 10;
            allapot.tiltasOldal = 1;
            tiltasListaRenderelese();
            return;
        }

        const gomb = event.target.closest('[data-tiltas-oldal]');
        if (!gomb || gomb.disabled) return;

        const osszes = tiltasOsszesOldal();
        allapot.tiltasOldal = gomb.dataset.tiltasOldal === 'elozo'
            ? Math.max(1, allapot.tiltasOldal - 1)
            : Math.min(osszes, allapot.tiltasOldal + 1);
        tiltasListaRenderelese();
    }

    function tiltasKartya(tiltas) {'''
text = text[:match.start()] + replacement + text[match.end():]
needle = "        onlineStatusz('A kézi foglalt idő mentve. A státuszát a Foglalások nézetben módosíthatod.');\n        tiltasokBetoltese();"
if needle not in text:
    raise SystemExit('new blocked time reset target not found')
text = text.replace(
    needle,
    "        onlineStatusz('A kézi foglalt idő mentve. A státuszát a Foglalások nézetben módosíthatod.');\n        allapot.tiltasOldal = 1;\n        tiltasokBetoltese();",
    1
)
availability.write_text(text, encoding='utf-8')

Path('tests/admin-blocked-times-pagination.spec.js').write_text(r'''const { test, expect } = require('playwright/test');
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
''', encoding='utf-8')
