const { test, expect } = require('@playwright/test');

test.describe('Lumi Nails PWA', () => {
  test('publishes a valid installable manifest', async ({ page }) => {
    await page.goto('/');

    await expect.poll(async () => {
      return page.locator('link[rel="manifest"]').getAttribute('href');
    }).toBe('/manifest.webmanifest');

    const response = await page.request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.name).toBe('Lumi Nails');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/kepek/favicon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/kepek/favicon-512.png', sizes: '512x512' })
    ]));
  });

  test('keeps live-data pages out of the offline page cache', async ({ page }) => {
    const response = await page.request.get('/sw.js');
    expect(response.ok()).toBeTruthy();

    const source = await response.text();
    expect(source).toContain("const NETWORK_ONLY_PATH_PREFIXES = ['/admin', '/fiokom', '/foglalas']");
    expect(source).not.toMatch(/CORE_ASSETS\s*=\s*\[[\s\S]*['\"]\/admin\/?['\"]/);
    expect(source).not.toMatch(/CORE_ASSETS\s*=\s*\[[\s\S]*['\"]\/fiokom\/?['\"]/);
    expect(source).not.toMatch(/CORE_ASSETS\s*=\s*\[[\s\S]*['\"]\/foglalas\/?['\"]/);
  });

  test('provides notification and badge helpers without requesting permission automatically', async ({ page }) => {
    await page.goto('/');

    await expect.poll(async () => page.evaluate(() => Boolean(window.LumiPWA))).toBe(true);
    const api = await page.evaluate(() => ({
      requestNotificationPermission: typeof window.LumiPWA.requestNotificationPermission,
      subscribeToPush: typeof window.LumiPWA.subscribeToPush,
      setBadge: typeof window.LumiPWA.setBadge,
      clearBadge: typeof window.LumiPWA.clearBadge
    }));

    expect(api).toEqual({
      requestNotificationPermission: 'function',
      subscribeToPush: 'function',
      setBadge: 'function',
      clearBadge: 'function'
    });
  });
});
