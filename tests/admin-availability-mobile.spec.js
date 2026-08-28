const { test, expect } = require('playwright/test');
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
