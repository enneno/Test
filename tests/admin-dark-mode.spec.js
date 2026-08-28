const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('dark mode is a persisted admin setting applied before the stylesheet', async () => {
  const index = read('admin/index.html');
  const workspace = read('src/admin/05-admin-workspace-v2.js');
  const foundation = read('src/admin-styles/00-foundation.css');
  const components = read('src/admin-styles/10-components.css');
  const shell = read('src/admin-styles/20-workspace.css');

  expect(index).toContain("localStorage.getItem('lumi-admin-theme')");
  expect(index.indexOf("localStorage.getItem('lumi-admin-theme')")).toBeLessThan(index.indexOf('admin-v2.css'));
  expect(workspace).toContain("const ADMIN_V2_THEME_STORAGE_KEY = 'lumi-admin-theme'");
  expect(workspace).toContain('data-admin-v2-dark-mode');
  expect(workspace).toContain("window.localStorage.setItem(ADMIN_V2_THEME_STORAGE_KEY, normalized)");
  expect(foundation).toContain('html[data-admin-theme="dark"]');
  expect(components).toContain('html[data-admin-theme="dark"] .admin-body.admin-v2');
  expect(shell).toContain('html[data-admin-theme="dark"] .admin-body.admin-v2');
  expect([foundation, components, shell].join('\n')).not.toMatch(/!important\s*;/);
});

test('dark theme changes the shared surfaces, controls, switch and PWA dock', async ({ page }) => {
  const css = read('admin-v2.css');
  await page.setContent(`<!doctype html><html data-admin-theme="dark"><head><style>${css}</style></head><body class="admin-body admin-v2 lumi-admin-standalone"><main id="admin-tartalom"><section class="admin-v2-settings-card"><label class="admin-v2-setting-row"><span><strong>Sötét mód</strong><small>Teszt</small></span><input type="checkbox" checked role="switch"></label></section><div class="admin-v2-segmented admin-segmented"><button class="admin-segmented-item is-active">Aktív</button></div><label class="admin-mezo"><input value="teszt"></label><div class="admin-v2-notification-panel"></div><div class="pwa-admin-toolbar-dock"></div></main></body></html>`);

  const metrics = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const card = getComputedStyle(document.querySelector('.admin-v2-settings-card'));
    const input = getComputedStyle(document.querySelector('.admin-mezo input'));
    const toggle = getComputedStyle(document.querySelector('.admin-v2-setting-row input'));
    const dock = getComputedStyle(document.querySelector('.pwa-admin-toolbar-dock'));
    const notification = getComputedStyle(document.querySelector('.admin-v2-notification-panel'));
    return {
      bodyBg: body.backgroundColor,
      bodyColor: body.color,
      cardBg: card.backgroundColor,
      inputBg: input.backgroundColor,
      inputColor: input.color,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      toggleBg: toggle.backgroundColor,
      dockBg: dock.backgroundColor,
      notificationBg: notification.backgroundColor
    };
  });

  expect(metrics.colorScheme).toBe('dark');
  expect(metrics.bodyBg).not.toBe('rgb(247, 244, 241)');
  expect(metrics.cardBg).not.toBe('rgb(255, 255, 255)');
  expect(metrics.inputBg).not.toBe('rgb(255, 250, 244)');
  expect(metrics.inputColor).not.toBe('rgb(43, 37, 33)');
  expect(metrics.toggleBg).not.toBe('rgb(44, 39, 36)');
  expect(metrics.dockBg).not.toBe('rgba(255, 252, 249, 0.9)');
  expect(metrics.notificationBg).not.toBe('rgb(255, 255, 255)');
});


test('booking calendar uses dark surfaces and dark status colors', async ({ page }) => {
  const css = read('admin-v2.css');
  await page.setContent(`<!doctype html><html data-admin-theme="dark"><head><style>${css}</style></head><body class="admin-body admin-v2"><main id="admin-tartalom"><section id="admin-panel-foglalasok"><div class="admin-foglalas-naptar"><div class="admin-foglalas-naptar-hetfej"><span>H</span><span>K</span><span>SZE</span><span>CS</span><span>P</span><span>SZO</span><span>V</span></div><div class="admin-foglalas-naptar-racs"><div class="admin-foglalas-naptar-cella"><button class="admin-foglalas-naptar-nap kijelolt"><span class="admin-foglalas-naptar-napszam">28</span><span class="admin-foglalas-naptar-darab">2</span><span class="admin-foglalas-naptar-esemeny admin-foglalas-naptar-statusz-done"><time>10:00</time></span></button></div><div class="admin-foglalas-naptar-cella admin-foglalas-naptar-ures"></div></div><div class="admin-foglalas-napi-panel"><button class="admin-foglalas-napi-sor"><span class="admin-foglalas-napi-ido">10:00</span><span class="admin-foglalas-napi-adat"><strong>Teszt</strong></span><span class="admin-foglalas-napi-statusz">Kész</span></button></div></div></section></main></body></html>`);

  const metrics = await page.evaluate(() => {
    const bg = selector => getComputedStyle(document.querySelector(selector)).backgroundColor;
    const color = selector => getComputedStyle(document.querySelector(selector)).color;
    return {
      header: bg('.admin-foglalas-naptar-hetfej'),
      cell: bg('.admin-foglalas-naptar-cella:not(.admin-foglalas-naptar-ures)'),
      empty: bg('.admin-foglalas-naptar-ures'),
      selected: bg('.admin-foglalas-naptar-nap.kijelolt'),
      count: bg('.admin-foglalas-naptar-darab'),
      done: bg('.admin-foglalas-naptar-statusz-done'),
      doneText: color('.admin-foglalas-naptar-statusz-done'),
      dayRow: bg('.admin-foglalas-napi-sor'),
      dayStatus: bg('.admin-foglalas-napi-statusz')
    };
  });

  expect(metrics.header).toBe('rgb(42, 36, 33)');
  expect(metrics.cell).toBe('rgb(33, 29, 27)');
  expect(metrics.empty).toBe('rgb(28, 25, 23)');
  expect(metrics.selected).toBe('rgb(56, 39, 41)');
  expect(metrics.count).toBe('rgb(51, 43, 40)');
  expect(metrics.done).toBe('rgb(36, 54, 43)');
  expect(metrics.doneText).toBe('rgb(234, 222, 218)');
  expect(metrics.dayRow).toBe('rgb(36, 32, 30)');
  expect(metrics.dayStatus).toBe('rgb(51, 44, 41)');
});
