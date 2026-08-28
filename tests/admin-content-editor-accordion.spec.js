const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

test('content section selector becomes the block header and accordions stay compact on mobile', async ({ page }) => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'admin-styles', '40-content-editor.css'), 'utf8');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head><style>
        :root { --admin-v2-border:#e4d9d3; --admin-v2-surface:#fffdfb; --admin-v2-surface-soft:#f8f4f1; --admin-v2-ink:#2f2825; --admin-v2-muted:#756965; --admin-v2-subtle:#9a8f8a; --admin-v2-brand-dark:#71453d; --admin-v2-brand-soft:#f5e9e7; --admin-v2-brand:#a35d75; --admin-v2-shadow:0 6px 20px rgba(67,42,35,.08); --admin-ui-choice-height:42px; }
        * { box-sizing:border-box; } body { margin:0; } ${css}
    </style></head><body class="admin-body admin-v2"><div id="admin-panel-szovegek"><div id="admin-cms-root"><div class="cms-editor-layout">
        <label class="cms-section-picker"><span>Szerkesztett szekció</span><select><option>kapcsolatfelvételi lehetőségek</option></select></label>
        <nav class="cms-section-index"></nav><section class="cms-editor-card"><div class="cms-editor-card-header"><h3>Foglalás – kapcsolatfelvételi lehetőségek</h3></div><div class="cms-section-body"><div class="cms-fieldsets">
        <details class="cms-fieldset" open><summary><span>Instagram</span><small>3 mező</small></summary><div class="admin-grid cms-field-grid cms-fieldset-grid"></div></details>
        <details class="cms-fieldset"><summary><span>Messenger</span><small>3 mező</small></summary><div class="admin-grid cms-field-grid cms-fieldset-grid"></div></details>
        </div></div></section></div></div></div></body></html>`);
    const metrics = await page.evaluate(() => {
        const picker=document.querySelector('.cms-section-picker'); const select=picker.querySelector('select'); const card=document.querySelector('.cms-editor-card'); const header=document.querySelector('.cms-editor-card-header'); const open=document.querySelector('.cms-fieldset[open] summary'); const closed=document.querySelector('.cms-fieldset:not([open]) summary'); const badge=open.querySelector('small');
        return { labelDisplay:getComputedStyle(picker.querySelector('span')).display, headerDisplay:getComputedStyle(header).display, layoutGap:getComputedStyle(document.querySelector('.cms-editor-layout')).rowGap, seam:Math.abs(card.getBoundingClientRect().top-picker.getBoundingClientRect().bottom), selectHeight:select.getBoundingClientRect().height, summaryDisplay:getComputedStyle(open).display, summaryHeight:open.getBoundingClientRect().height, radius:parseFloat(getComputedStyle(open.closest('.cms-fieldset')).borderTopLeftRadius), badgeRadius:parseFloat(getComputedStyle(badge).borderTopLeftRadius), openBg:getComputedStyle(open).backgroundColor, closedBg:getComputedStyle(closed).backgroundColor, overflow:document.documentElement.scrollWidth-window.innerWidth };
    });
    expect(metrics.labelDisplay).toBe('none');
    expect(metrics.headerDisplay).toBe('none');
    expect(metrics.layoutGap).toBe('0px');
    expect(metrics.seam).toBeLessThanOrEqual(1);
    expect(metrics.selectHeight).toBeGreaterThanOrEqual(44);
    expect(metrics.summaryDisplay).toBe('grid');
    expect(metrics.summaryHeight).toBeGreaterThanOrEqual(48);
    expect(metrics.summaryHeight).toBeLessThanOrEqual(52);
    expect(metrics.radius).toBeGreaterThanOrEqual(10);
    expect(metrics.badgeRadius).toBeGreaterThanOrEqual(20);
    expect(metrics.openBg).not.toBe(metrics.closedBg);
    expect(metrics.overflow).toBeLessThanOrEqual(1);
});
