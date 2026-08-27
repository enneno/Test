const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('gallery workspace keeps image controls within the preview height, paginates, and promotes new images to the top', async ({ page }) => {
    const adminCss = [
        '00-foundation.css',
        '05-panel-state.css',
        '15-responsive-context.css',
        '20-workspace.css',
        '30-bookings.css',
        '40-content-editor.css',
        '42-cms-image-controls.css',
        '45-gallery-editor.css',
        '50-services.css',
        '60-coupons.css',
        '70-availability.css',
        '80-communications.css',
        '90-customers.css',
        '95-pwa.css',
        '10-components.css'
    ].map(file => source(`src/admin-styles/${file}`)).join('\n');
    const galleryWorkspaceJs = source('src/admin/45-gallery-workspace.js');
    const imageWorkspaceJs = source('src/admin/46-cms-image-workspace.js');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html>
        <html>
        <head><style>${adminCss}</style></head>
        <body class="admin-body admin-v2">
            <main id="admin-tartalom">
                <div id="admin-panel-szovegek" class="admin-panel aktiv">
                    <div id="admin-cms-root">
                        <div class="cms-view-tabs" role="tablist">
                            <button type="button" class="cms-view-tab" data-cms-view="oldalak" aria-selected="true">Oldalak</button>
                        </div>
                        <label class="cms-section-picker"><span>Szekció</span>
                            <select data-cms-section-select><option value="7" selected>Galéria</option></select>
                        </label>
                        <div class="cms-editor-card">
                            <div class="cms-editor-card-header"><h3>Galéria oldal és teljes galéria</h3></div>
                            <div class="cms-section-body">
                                <div class="cms-gallery-editor">
                                    <div class="cms-gallery-header">
                                        <div><h3>Galéria képei</h3><span class="cms-gallery-selection-count">5 / 5 kép jelenik meg a főoldalon</span></div>
                                        <button type="button" class="admin-hozzaadas" data-cms-gallery-add>Új galériakép</button>
                                    </div>
                                    <div class="cms-gallery-list"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <script>
                function cardHtml(index, isNew) {
                    const image = isNew
                        ? '<span>Nincs kiválasztott kép</span>'
                        : '<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22800%22%3E%3Crect width=%22600%22 height=%22800%22 fill=%22%23d9aaa7%22/%3E%3C/svg%3E" alt="Teszt kép">';
                    return [
                        '<article class="cms-gallery-item" ' + (isNew ? 'data-new-item="true"' : '') + '>',
                        '<h4>' + (index + 1) + '. kép</h4>',
                        '<label class="cms-gallery-home-choice"><input type="checkbox"><span>Megjelenjen a főoldali galériaátvezetőben</span></label>',
                        '<div class="cms-image-field admin-mezo admin-mezo-szeles">',
                        '<span class="cms-field-label">Fotó</span>',
                        '<div class="cms-image-preview" data-cms-preview="galeria.elemek.' + index + '.kep">' + image + '<span>Kép előnézet</span></div>',
                        '<div class="cms-image-controls">',
                        '<label class="admin-hozzaadas cms-upload-button">Kép feltöltése<input type="file" data-cms-upload="galeria.elemek.' + index + '.kep"></label>',
                        '<button type="button" class="admin-kis-gomb" data-cms-remove-image="galeria.elemek.' + index + '.kep">Kép eltávolítása</button>',
                        '</div>',
                        '<input class="cms-image-url" value="/kepek/' + index + '.jpg">',
                        '</div>',
                        '<label class="admin-mezo"><span>Kép leírása</span><input data-cms-path="galeria.elemek.' + index + '.kepAlt" value="Teszt ' + (index + 1) + '"></label>',
                        '<label class="admin-mezo"><input type="checkbox" data-cms-path="galeria.elemek.' + index + '.magas"><span>Magas kiemelt csempe</span></label>',
                        '<div class="cms-gallery-actions">',
                        '<button type="button" class="admin-kis-gomb" data-cms-gallery-move="up" data-index="' + index + '">↑ Feljebb</button>',
                        '<button type="button" class="admin-kis-gomb" data-cms-gallery-move="down" data-index="' + index + '">↓ Lejjebb</button>',
                        '<button type="button" class="admin-kis-gomb admin-veszely-gomb" data-cms-gallery-delete="' + index + '">Törlés</button>',
                        '</div>',
                        '</article>'
                    ].join('');
                }

                const list = document.querySelector('.cms-gallery-list');
                for (let index = 0; index < 12; index += 1) list.insertAdjacentHTML('beforeend', cardHtml(index, false));

                function renumber() {
                    Array.from(list.children).forEach((card, index) => {
                        card.querySelector('h4').textContent = (index + 1) + '. kép';
                        const preview = card.querySelector('[data-cms-preview]');
                        if (preview) preview.dataset.cmsPreview = 'galeria.elemek.' + index + '.kep';
                        const upload = card.querySelector('[data-cms-upload]');
                        if (upload) upload.dataset.cmsUpload = 'galeria.elemek.' + index + '.kep';
                        const remove = card.querySelector('[data-cms-remove-image]');
                        if (remove) remove.dataset.cmsRemoveImage = 'galeria.elemek.' + index + '.kep';
                        const alt = card.querySelector('[data-cms-path$=".kepAlt"]');
                        if (alt) alt.dataset.cmsPath = 'galeria.elemek.' + index + '.kepAlt';
                        const up = card.querySelector('[data-cms-gallery-move="up"]');
                        const down = card.querySelector('[data-cms-gallery-move="down"]');
                        if (up) up.dataset.index = String(index);
                        if (down) down.dataset.index = String(index);
                        const deletion = card.querySelector('[data-cms-gallery-delete]');
                        if (deletion) deletion.dataset.cmsGalleryDelete = String(index);
                    });
                }

                document.addEventListener('DOMContentLoaded', () => {
                    const root = document.getElementById('admin-cms-root');
                    root.addEventListener('click', event => {
                        if (event.target.closest('[data-cms-gallery-add]')) {
                            const index = list.children.length;
                            list.insertAdjacentHTML('beforeend', cardHtml(index, true));
                            return;
                        }

                        const move = event.target.closest('[data-cms-gallery-move]');
                        if (!move) return;
                        const card = move.closest('.cms-gallery-item');
                        if (move.dataset.cmsGalleryMove === 'up') {
                            const previous = card.previousElementSibling;
                            if (previous) list.insertBefore(card, previous);
                        } else {
                            const next = card.nextElementSibling;
                            if (next) list.insertBefore(next, card);
                        }
                        renumber();
                    });
                });
            </script>
            <script>${galleryWorkspaceJs}</script>
            <script>${imageWorkspaceJs}</script>
        </body>
        </html>`);

    const galleryTab = page.locator('[data-lumi-cms-gallery-tab]');
    await expect(galleryTab).toBeVisible();
    await galleryTab.click();
    await expect(page.locator('#admin-cms-root')).toHaveAttribute('data-lumi-cms-gallery-context', 'images');

    const selector = page.locator('[data-lumi-gallery-page-size]');
    await expect(selector).toBeVisible();
    await expect(selector.locator('option')).toHaveText(['10', '20', 'Összes']);
    await expect(selector).toHaveValue('10');
    await expect(page.locator('[data-lumi-gallery-page-label]')).toHaveText('1 / 2');
    await expect(page.locator('.cms-gallery-item:visible')).toHaveCount(10);

    const firstItem = page.locator('.cms-gallery-item').first();
    await expect(firstItem.locator('.cms-image-controls > .cms-gallery-home-choice')).toHaveCount(1);
    await expect(firstItem.locator(':scope > .cms-gallery-home-choice')).toHaveCount(0);

    const controlMetrics = await firstItem.evaluate(item => {
        const preview = item.querySelector('.cms-image-preview').getBoundingClientRect();
        const controls = item.querySelector('.cms-image-controls').getBoundingClientRect();
        const buttons = Array.from(item.querySelectorAll('.cms-image-controls .cms-icon-button'))
            .filter(button => !button.classList.contains('cms-gallery-delete-source'))
            .filter(button => {
                const style = getComputedStyle(button);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map(button => button.getBoundingClientRect());
        return {
            previewBottom: preview.bottom,
            controlsBottom: controls.bottom,
            buttonRects: buttons.map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })),
            overflow: document.documentElement.scrollWidth - window.innerWidth
        };
    });
    expect(controlMetrics.buttonRects).toHaveLength(3);
    expect(Math.max(...controlMetrics.buttonRects.map(rect => rect.top)) - Math.min(...controlMetrics.buttonRects.map(rect => rect.top))).toBeLessThanOrEqual(1);
    expect(controlMetrics.buttonRects[1].left).toBeGreaterThanOrEqual(controlMetrics.buttonRects[0].right);
    expect(controlMetrics.buttonRects[2].left).toBeGreaterThanOrEqual(controlMetrics.buttonRects[1].right);
    expect(controlMetrics.controlsBottom).toBeLessThanOrEqual(controlMetrics.previewBottom + 1);
    expect(controlMetrics.overflow).toBeLessThanOrEqual(2);

    await selector.selectOption('20');
    await expect(page.locator('.cms-gallery-item:visible')).toHaveCount(12);
    await expect(page.locator('[data-lumi-gallery-page-label]')).toHaveText('1 / 1');

    await selector.selectOption('10');
    await page.locator('[data-lumi-gallery-page="next"]').click();
    await expect(page.locator('[data-lumi-gallery-page-label]')).toHaveText('2 / 2');
    await expect(page.locator('.cms-gallery-item:visible')).toHaveCount(2);

    await page.locator('[data-cms-gallery-add]').click();
    await expect(page.locator('.cms-gallery-list > .cms-gallery-item').first()).toHaveAttribute('data-new-item', 'true');
    await expect(page.locator('[data-lumi-gallery-page-label]')).toHaveText('1 / 2');
    await expect(page.locator('.cms-gallery-item:visible')).toHaveCount(10);
});
