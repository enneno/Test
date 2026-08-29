const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = () => fs.readFileSync(path.join(root, 'admin-v2.css'), 'utf8');

test('mobile communications keeps the summary compact after retiring the legacy PWA quick-add', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head><style>${css()}</style></head><body class="admin-body admin-v2 lumi-admin-standalone" data-admin-v2-group="kommunikacio"><main id="admin-tartalom"><section class="admin-v2-communication-summary"><div><span>Mai email esemény</span><strong>0</strong></div><div><span>Sikeres</span><strong>110</strong></div><div><span>Nyitott hibák</span><strong>0</strong></div><div><span>Legutóbbi hiba</span><strong>Nincs</strong></div><div class="admin-v2-communication-action"><p>Nincs nyitott emailhiba.</p><button type="button" class="admin-v2-button admin-v2-button-secondary" hidden>Emailhibák nyugtázása</button></div></section></main></body></html>`);

    const metrics = await page.evaluate(() => {
        const summary = document.querySelector('.admin-v2-communication-summary');
        const stats = Array.from(summary.children).slice(0, 4);
        const action = summary.querySelector('.admin-v2-communication-action');
        const hiddenButton = action.querySelector('button');
        return {
            columns: getComputedStyle(summary).gridTemplateColumns.trim().split(/\s+/).length,
            statMaxHeight: Math.max(...stats.map(card => card.getBoundingClientRect().height)),
            actionHeight: action.getBoundingClientRect().height,
            hiddenButtonDisplay: getComputedStyle(hiddenButton).display,
            quickAddCount: document.querySelectorAll('.pwa-admin-quick-add').length,
            overflow: document.documentElement.scrollWidth - window.innerWidth
        };
    });

    expect(metrics.columns).toBe(2);
    expect(metrics.statMaxHeight).toBeLessThanOrEqual(72);
    expect(metrics.actionHeight).toBeLessThanOrEqual(60);
    expect(metrics.hiddenButtonDisplay).toBe('none');
    expect(metrics.quickAddCount).toBe(0);
    expect(css()).not.toContain('.pwa-admin-quick-add');
    expect(metrics.overflow).toBeLessThanOrEqual(1);
});
