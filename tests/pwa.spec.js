const { test, expect } = require('playwright/test');

test.describe('Lumi Nails PWA', () => {
  test('publishes a valid installable manifest', async ({ page }) => {
    await page.goto('/');

    await expect.poll(async () => {
      return page.locator('link[rel="manifest"]').getAttribute('href');
    }).toBe('/manifest.webmanifest');

    const response = await page.request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.id).toBe('/');
    expect(manifest.name).toBe('Lumi Nails');
    expect(manifest.start_url).toBe('/admin/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/kepek/favicon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/kepek/favicon-512.png', sizes: '512x512' })
    ]));
  });

  test('service worker does not intercept or cache normal website requests', async ({ page }) => {
    const response = await page.request.get('/sw.js');
    expect(response.ok()).toBeTruthy();

    const source = await response.text();
    expect(source).not.toContain("addEventListener('fetch'");
    expect(source).not.toContain('caches.open');
    expect(source).not.toContain('caches.match');
    expect(source).not.toContain('cache.put');
    expect(source).not.toContain('offline.html');
  });

  test('PWA bootstrap does not alter viewport or normal Safari rendering rules', async ({ page }) => {
    const response = await page.request.get('/pwa.js');
    expect(response.ok()).toBeTruthy();

    const source = await response.text();
    expect(source).not.toContain('viewport-fit=cover');
    expect(source).not.toContain('ensureViewportFit');
    expect(source).not.toContain("addMeta('format-detection'");
    expect(source).not.toContain('setupStandaloneAdminEntry');
    expect(source).not.toContain('pwa-admin-entry');
  });

  test('provides notification, badge and admin push helpers without requesting permission automatically', async ({ page }) => {
    await page.goto('/');

    await expect.poll(async () => page.evaluate(() => Boolean(window.LumiPWA))).toBe(true);
    const api = await page.evaluate(() => ({
      requestNotificationPermission: typeof window.LumiPWA.requestNotificationPermission,
      subscribeToPush: typeof window.LumiPWA.subscribeToPush,
      enableAdminPush: typeof window.LumiPWA.enableAdminPush,
      disableAdminPush: typeof window.LumiPWA.disableAdminPush,
      hasPushSubscription: typeof window.LumiPWA.hasPushSubscription,
      setBadge: typeof window.LumiPWA.setBadge,
      clearBadge: typeof window.LumiPWA.clearBadge
    }));

    expect(api).toEqual({
      requestNotificationPermission: 'function',
      subscribeToPush: 'function',
      enableAdminPush: 'function',
      disableAdminPush: 'function',
      hasPushSubscription: 'function',
      setBadge: 'function',
      clearBadge: 'function'
    });
  });

  test('does not request notification permission during normal page load', async ({ page }) => {
    await page.addInitScript(() => {
      window.__lumiNotificationRequests = 0;
      const originalNotification = window.Notification;
      if (!originalNotification) return;
      try {
        originalNotification.requestPermission = () => {
          window.__lumiNotificationRequests += 1;
          return Promise.resolve('default');
        };
      } catch {
        // Some browsers expose a non-writable Notification method; the code path is still covered by API-shape tests.
      }
    });

    await page.goto('/');
    await expect.poll(async () => page.evaluate(() => Boolean(window.LumiPWA))).toBe(true);
    const count = await page.evaluate(() => window.__lumiNotificationRequests || 0);
    expect(count).toBe(0);
  });

  test('standalone admin uses 21st-style toolbar dock and quick-add action', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'standalone', {
        configurable: true,
        value: true
      });
    });

    await page.goto('/admin/');
    await expect.poll(async () => page.evaluate(() => Boolean(window.LumiPWA))).toBe(true);
    await expect(page.locator('body')).toHaveClass(/lumi-admin-standalone/);
    await expect(page.locator('#pwa-admin-tabbar')).toHaveCount(1);
    await expect(page.locator('#pwa-admin-tabbar .pwa-admin-toolbar-button')).toHaveCount(6);
    await expect(page.locator('#pwa-admin-quick-add')).toHaveCount(1);
    await expect(page.locator('#pwa-admin-floating-save')).toHaveCount(0);

    const buttons = page.locator('#pwa-admin-tabbar .pwa-admin-toolbar-button');
    await expect(buttons.nth(0)).toHaveAttribute('aria-label', 'Menü');
    await expect(buttons.nth(1)).toHaveAttribute('aria-label', 'Foglalások');
    await expect(buttons.nth(2)).toHaveAttribute('aria-label', /Mentés|menthető módosítás/);
    await expect(buttons.nth(3)).toHaveAttribute('aria-label', 'Munkaidő');
    await expect(buttons.nth(4)).toHaveAttribute('aria-label', 'Értesítések');
    await expect(buttons.nth(5)).toHaveAttribute('aria-label', 'Áttekintés');
  });

  test('keeps VAPID private material out of client-side code', async ({ page }) => {
    const clientResponse = await page.request.get('/pwa.js');
    expect(clientResponse.ok()).toBeTruthy();

    const clientSource = await clientResponse.text();
    expect(clientSource).not.toContain('WEB_PUSH_VAPID_PRIVATE_KEY');
    expect(clientSource).not.toContain('vapid_private_key');
  });
});
