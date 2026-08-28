const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('shared admin controls have one visual owner and equal mobile pagination geometry', async ({ page }) => {
    const components = source('src/admin-styles/10-components.css');
    const bookings = source('src/admin-styles/30-bookings.css');
    const content = source('src/admin-styles/40-content-editor.css');
    const imageControls = source('src/admin-styles/42-cms-image-controls.css');
    const gallery = source('src/admin-styles/45-gallery-editor.css');
    const galleryJs = source('src/admin/45-gallery-workspace.js');
    const imageJs = source('src/admin/46-cms-image-workspace.js');
    const bookingJs = source('src/admin/10-bookings-events.js');

    expect(components).toContain('Shared pagination: bookings, event log and gallery');
    expect(components).toContain('.admin-control-icon-button');
    expect(components).toContain('.admin-segmented');
    expect(components).toContain('.cms-gallery-home-choice input[type="checkbox"]');
    expect(bookings).not.toMatch(/#admin-panel-foglalasok \.admin-lapozo-nav\s*\{/);
    expect(bookings).not.toMatch(/#admin-panel-foglalasok \.admin-pagination-button\s*\{/);
    expect(gallery).not.toContain('.cms-gallery-page-nav');
    expect(gallery).not.toContain('.cms-gallery-page-button');
    expect(gallery).not.toContain('.cms-gallery-page-label');
    expect(imageControls).not.toMatch(/\.cms-icon-button\s*\{[^}]*width:/s);
    expect(content).not.toContain('width: 18px; height: 18px; margin: 0; accent-color');
    expect(content).not.toContain('.admin-mezo textarea { background: #fff; }');
    expect(galleryJs).toContain('class="admin-lapozo-nav"');
    expect(galleryJs).toContain('class="admin-pagination-button"');
    expect(galleryJs).toContain('class="admin-pagination-page"');
    expect(galleryJs).toContain('admin-oldalmeret admin-pagination-size');
    expect(imageJs).toContain("classList.add('cms-icon-button', 'admin-control-icon-button')");
    expect(bookingJs).toContain('admin-booking-icon-button admin-control-icon-button');
    expect(bookingJs).toContain('aria-label="Eseménynapló lapozása"');

    for (const css of [components, bookings, content, imageControls, gallery]) {
        const codeOnly = css.replace(/\/\*[\s\S]*?\*\//g, '');
        expect(codeOnly).not.toContain('!important');
    }

    const css = [
        '00-foundation.css', '05-panel-state.css', '10-components.css', '15-responsive-context.css',
        '20-workspace.css', '30-bookings.css', '40-content-editor.css', '42-cms-image-controls.css',
        '45-gallery-editor.css'
    ].map(file => source(`src/admin-styles/${file}`)).join('\n');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body class="admin-body admin-v2"><main id="admin-tartalom">
        <section id="admin-panel-foglalasok"><div class="admin-lapozo"><div class="admin-lapozo-nav" data-booking-nav>
            <button class="admin-pagination-button"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg><span>Előző</span></button><span class="admin-pagination-page">1 / 5</span><button class="admin-pagination-button"><span>Következő</span><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg></button>
        </div><div class="admin-lapozo-jobb"><label class="admin-oldalmeret admin-pagination-size"><span>Oldalanként</span><select class="admin-oldalmeret-select" data-booking-size><option>10</option></select></label></div></div>
        <div class="admin-foglalas-nezetvalto admin-segmented"><button class="admin-foglalas-nezet-gomb admin-segmented-item aktiv">Lista</button><button class="admin-foglalas-nezet-gomb admin-segmented-item">Naptár</button></div>
        <button class="admin-control-icon-button admin-booking-icon-button" data-booking-icon><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"></path></svg></button></section>
        <section id="admin-panel-szovegek"><div id="admin-cms-root" data-lumi-cms-gallery-context="images"><div class="cms-gallery-pagination"><div class="admin-lapozo-nav" data-gallery-nav>
            <button class="admin-pagination-button"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg><span>Előző</span></button><span class="admin-pagination-page">1 / 2</span><button class="admin-pagination-button"><span>Következő</span><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg></button>
        </div><label class="admin-oldalmeret admin-pagination-size"><span>Oldalanként</span><select class="admin-oldalmeret-select" data-gallery-size><option>10</option></select></label></div>
        <div class="cms-view-tabs admin-segmented"><button class="cms-view-tab admin-segmented-item" aria-selected="true">Főoldal</button><button class="cms-view-tab admin-segmented-item">Foglalás</button></div><label class="cms-gallery-home-choice"><input type="checkbox" data-gallery-checkbox><span>Megjelenjen</span></label><button class="cms-icon-button admin-control-icon-button" data-gallery-icon><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"></path></svg></button></div></section>
    </main></body></html>`);

    const metrics = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { width: r.width, height: r.height }; };
        const style = selector => getComputedStyle(document.querySelector(selector));
        return {
            bookingNav: rect('[data-booking-nav]'), galleryNav: rect('[data-gallery-nav]'),
            bookingButton: rect('[data-booking-nav] .admin-pagination-button'), galleryButton: rect('[data-gallery-nav] .admin-pagination-button'),
            bookingPage: rect('[data-booking-nav] .admin-pagination-page'), galleryPage: rect('[data-gallery-nav] .admin-pagination-page'),
            bookingSize: rect('[data-booking-size]'), gallerySize: rect('[data-gallery-size]'),
            bookingSegmentRadius: style('.admin-foglalas-nezetvalto').borderRadius, cmsSegmentRadius: style('.cms-view-tabs').borderRadius,
            bookingActiveBg: style('.admin-foglalas-nezet-gomb.aktiv').backgroundColor, cmsActiveBg: style('.cms-view-tab[aria-selected="true"]').backgroundColor,
            bookingIcon: rect('[data-booking-icon]'), galleryIcon: rect('[data-gallery-icon]'), galleryCheckbox: rect('[data-gallery-checkbox]')
        };
    });

    expect(metrics.galleryNav.height).toBeCloseTo(metrics.bookingNav.height, 1);
    expect(metrics.galleryButton).toEqual(metrics.bookingButton);
    expect(metrics.galleryPage).toEqual(metrics.bookingPage);
    expect(metrics.gallerySize).toEqual(metrics.bookingSize);
    expect(metrics.cmsSegmentRadius).toBe(metrics.bookingSegmentRadius);
    expect(metrics.cmsActiveBg).toBe(metrics.bookingActiveBg);
    expect(metrics.galleryIcon).toEqual(metrics.bookingIcon);
    expect(metrics.galleryCheckbox.width).toBeCloseTo(18, 1);
    expect(metrics.galleryCheckbox.height).toBeCloseTo(18, 1);
});
