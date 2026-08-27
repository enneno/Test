from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "admin/index.html",
    '''                            <label class="admin-mezo">\n                                Hónap\n                                <input type="month" id="admin-naptar-honap">\n                            </label>''',
    '''                            <label class="admin-mezo">\n                                <input type="month" id="admin-naptar-honap" aria-label="Hónap">\n                            </label>''',
    "month label",
)

replace_once(
    "admin/index.html",
    '''                            <label class="admin-mezo">\n                                Időpontok sűrűsége\n                                <input type="number" id="admin-naptar-kozos-lepes" min="5" step="5" value="30">\n                            </label>''',
    '''                            <label class="admin-mezo admin-naptar-lepes-mezo">\n                                <span class="admin-naptar-lepes-cimke">Időpontok sűrűsége</span>\n                                <input type="number" id="admin-naptar-kozos-lepes" min="5" step="5" value="30">\n                            </label>''',
    "density markup",
)

replace_once(
    "src/admin/05-admin-workspace-v2.js",
    "                nav.className = 'admin-v2-subnav';",
    "                nav.className = 'admin-v2-subnav admin-segmented';",
    "shared subnav container",
)
replace_once(
    "src/admin/05-admin-workspace-v2.js",
    '''                    <button type="button" data-admin-v2-panel="${target}">${label}</button>''',
    '''                    <button type="button" class="admin-segmented-item" data-admin-v2-panel="${target}">${label}</button>''',
    "shared subnav item",
)

replace_once(
    "src/admin-styles/10-components.css",
    '.admin-body.admin-v2 :is(.admin-segmented-item.aktiv, .admin-segmented-item[aria-selected="true"]) {',
    '''.admin-body.admin-v2 :is(
  .admin-segmented-item.aktiv,
  .admin-segmented-item.is-active,
  .admin-segmented-item[aria-selected="true"]
) {''',
    "shared segmented active state",
)

replace_once(
    "src/admin-styles/20-workspace.css",
    '''.admin-body.admin-v2 .admin-v2-subnav {
  display: flex;
  align-items: center;
  width: 100%;
  margin: -3px 0 18px;
  padding: 4px;
  gap: 3px;
  overflow: hidden;
  border: 1px solid var(--admin-v2-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.62);
  scrollbar-width: thin;
}

.admin-body.admin-v2 .admin-v2-subnav button {
  flex: 1 1 0;
  min-width: 0;
  min-height: 44px;
  padding: 7px 12px;
  border: 0;
  border-radius: 7px;
  color: var(--admin-v2-muted);
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
  text-align: center;
}

.admin-body.admin-v2 .admin-v2-subnav button.is-active {
  color: var(--admin-v2-brand-dark);
  background: var(--admin-v2-surface);
  box-shadow: 0 2px 8px rgba(67, 42, 35, 0.08);
}
''',
    '''.admin-body.admin-v2 .admin-v2-subnav {
  display: flex;
  align-items: center;
  width: 100%;
  margin: -3px 0 18px;
  overflow: hidden;
}

.admin-body.admin-v2 .admin-v2-subnav .admin-segmented-item {
  flex: 1 1 0;
  min-width: 0;
  white-space: nowrap;
  text-align: center;
}
''',
    "subnav visual ownership",
)

availability_marker = '''.admin-body.admin-v2 .admin-kozos-idosav-sor {
  display: grid;
  grid-template-columns: minmax(112px, 140px) minmax(112px, 140px) minmax(72px, 86px) auto;
  align-items: end;
  justify-content: start;
  gap: 10px;
}
'''
replace_once(
    "src/admin-styles/70-availability.css",
    availability_marker,
    availability_marker + '''.admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-lepes-cimke {
  display: block;
  width: 100%;
  white-space: nowrap;
}
.admin-body.admin-v2 #admin-naptar-kozos-lepes { text-align: center; }
''',
    "density layout",
)
replace_once(
    "src/admin-styles/70-availability.css",
    '''  .admin-body.admin-v2 #admin-idosav-naptar .admin-kozos-idosav-sor { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .admin-body.admin-v2 #admin-idosav-naptar .admin-kozos-idosav-sor .admin-hozzaadas {''',
    '''  .admin-body.admin-v2 #admin-idosav-naptar .admin-kozos-idosav-sor { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .admin-body.admin-v2 #admin-idosav-naptar .admin-naptar-lepes-cimke { font-size: 10px; }
  .admin-body.admin-v2 #admin-idosav-naptar .admin-kozos-idosav-sor .admin-hozzaadas {''',
    "density mobile label",
)

Path("tests/admin-availability-mobile.spec.js").write_text(
    r'''const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');
const source = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('worktime mobile controls stay compact and use shared segmented styling', async ({ page }) => {
  const html = source('admin/index.html');
  const js = source('src/admin/05-admin-workspace-v2.js');
  const components = source('src/admin-styles/10-components.css');
  const workspace = source('src/admin-styles/20-workspace.css');
  const availability = source('src/admin-styles/70-availability.css');

  expect(html).toContain('<input type="month" id="admin-naptar-honap" aria-label="Hónap">');
  expect(html).toContain('class="admin-naptar-lepes-cimke">Időpontok sűrűsége</span>');
  expect(js).toContain("nav.className = 'admin-v2-subnav admin-segmented';");
  expect(js).toContain('class="admin-segmented-item" data-admin-v2-panel="${target}"');
  expect(components).toContain('.admin-segmented-item.is-active');
  expect(workspace).not.toMatch(/\.admin-v2-subnav button\.is-active/);
  expect(availability).toContain('#admin-naptar-kozos-lepes { text-align: center; }');

  const css = ['00-foundation.css','10-components.css','20-workspace.css','70-availability.css']
    .map(f => source(`src/admin-styles/${f}`)).join('\n');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`<!doctype html><style>${css}</style><body class="admin-body admin-v2"><main id="admin-tartalom"><div style="container:admin-workspace / inline-size;width:390px"><nav class="admin-v2-subnav admin-segmented"><button class="admin-segmented-item is-active">Foglalható napok</button><button class="admin-segmented-item">Kieső időszakok</button></nav><div id="admin-idosav-naptar"><div class="admin-kozos-idosav-sor"><label class="admin-mezo">Közös kezdés<input type="time" value="09:00"></label><label class="admin-mezo">Közös vége<input type="time" value="18:00"></label><label class="admin-mezo admin-naptar-lepes-mezo"><span class="admin-naptar-lepes-cimke" data-label>Időpontok sűrűsége</span><input id="admin-naptar-kozos-lepes" type="number" value="30" data-value></label><button class="admin-hozzaadas">Kijelöltekre beállítom</button></div></div></div></main>`);
  const m = await page.evaluate(() => {
    const label = document.querySelector('[data-label]');
    return {
      font: getComputedStyle(label).fontSize,
      nowrap: getComputedStyle(label).whiteSpace,
      fits: label.scrollWidth <= label.clientWidth + .5,
      align: getComputedStyle(document.querySelector('[data-value]')).textAlign,
      active: getComputedStyle(document.querySelector('.is-active')).backgroundColor
    };
  });
  expect(m.font).toBe('10px');
  expect(m.nowrap).toBe('nowrap');
  expect(m.fits).toBe(true);
  expect(m.align).toBe('center');
  expect(m.active).not.toBe('rgba(0, 0, 0, 0)');
});
''',
    encoding="utf-8",
)
