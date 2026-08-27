const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('shared CMS image workspace keeps previews left, every control right, and gallery actions in the same control column', async ({ page }) => {
    const foundationCss = source('src/admin-styles/00-foundation.css');
    const contentCss = source('src/admin-styles/40-content-editor.css');
    const galleryCss = source('src/admin-styles/45-gallery-editor.css');
    const componentsCss = source('src/admin-styles/10-components.css');
    const imageWorkspaceJs = source('src/admin/46-cms-image-workspace.js');

    expect(contentCss).not.toContain('!important');
    expect(galleryCss).not.toContain('!important');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html>
        <html>
        <head>
            <style>${foundationCss}\n${contentCss}\n${galleryCss}\n${componentsCss}</style>
        </head>
        <body class="admin-body admin-v2">
            <main id="admin-tartalom">
                <div id="admin-panel-szovegek">
                    <div id="admin-cms-root">
                        <div class="cms-image-field admin-mezo admin-mezo-szeles" data-test-general-image>
                            <span class="cms-field-label">Nyitókép</span>
                            <div class="cms-image-preview" data-cms-preview="fooldal.hero.kep">
                                <img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22800%22%3E%3Crect width=%22600%22 height=%22800%22 fill=%22%23d9aaa7%22/%3E%3C/svg%3E" alt="Teszt kép">
                                <span>Kép előnézet</span>
                            </div>
                            <div class="cms-image-controls">
                                <label class="admin-hozzaadas cms-upload-button">Kép feltöltése<input type="file"></label>
                                <button type="button" class="admin-kis-gomb">Kép eltávolítása</button>
                            </div>
                            <input class="cms-image-url" value="/kepek/teszt.jpg">
                        </div>

                        <article class="cms-gallery-item" data-test-gallery-image>
                            <h4>1. kép</h4>
                            <label class="cms-gallery-home-choice"><input type="checkbox"><span>Megjelenjen a főoldali galériaátvezetőben</span></label>
                            <div class="cms-image-field admin-mezo admin-mezo-szeles">
                                <span class="cms-field-label">Fotó</span>
                                <div class="cms-image-preview" data-cms-preview="galeria.elemek.0.kep">
                                    <img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22800%22%3E%3Crect width=%22600%22 height=%22800%22 fill=%22%23c59e9a%22/%3E%3C/svg%3E" alt="Galéria teszt kép">
                                    <span>Kép előnézet</span>
                                </div>
                                <div class="cms-image-controls">
                                    <label class="admin-hozzaadas cms-upload-button">Kép feltöltése<input type="file"></label>
                                    <button type="button" class="admin-kis-gomb" data-cms-remove-image>Kép eltávolítása</button>
                                </div>
                                <input class="cms-image-url" value="/kepek/galeria.jpg">
                            </div>
                            <label class="admin-mezo"><span>Kép leírása</span><input data-cms-path="galeria.elemek.0.kepAlt"></label>
                            <label class="admin-mezo"><input type="checkbox" data-cms-path="galeria.elemek.0.magas"><span>Magas kiemelt csempe</span></label>
                            <div class="cms-gallery-actions">
                                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="up">↑ Feljebb</button>
                                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="down">↓ Lejjebb</button>
                                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-cms-gallery-delete="0">Törlés</button>
                            </div>
                        </article>
                    </div>
                </div>
            </main>
            <script>${imageWorkspaceJs}</script>
        </body>
        </html>`);

    const generalField = page.locator('[data-test-general-image]');
    await expect(generalField.locator('.cms-image-preview')).toHaveAttribute('role', 'button');
    await expect(generalField.locator('.cms-image-preview')).toHaveAttribute('aria-label', 'Kép nagyítása');

    const generalMetrics = await generalField.evaluate(field => {
        const preview = field.querySelector('.cms-image-preview').getBoundingClientRect();
        const controls = field.querySelector('.cms-image-controls').getBoundingClientRect();
        return {
            previewRight: preview.right,
            controlsLeft: controls.left,
            overflow: document.documentElement.scrollWidth - window.innerWidth
        };
    });
    expect(generalMetrics.previewRight).toBeLessThanOrEqual(generalMetrics.controlsLeft + 1);
    expect(generalMetrics.overflow).toBeLessThanOrEqual(1);

    await page.locator('#admin-cms-root').evaluate(root => {
        root.dataset.lumiCmsGalleryContext = 'images';
    });

    const galleryItem = page.locator('[data-test-gallery-image]');
    const galleryControls = galleryItem.locator('.cms-image-controls');
    await expect(galleryControls.locator(':scope > .cms-gallery-actions')).toHaveCount(1);
    await expect(galleryItem.locator(':scope > .cms-gallery-actions')).toHaveCount(0);
    await expect(galleryControls.locator('.cms-gallery-actions button')).toHaveCount(3);

    const galleryMetrics = await galleryItem.evaluate(item => {
        const preview = item.querySelector('.cms-image-preview').getBoundingClientRect();
        const controls = item.querySelector('.cms-image-controls').getBoundingClientRect();
        const actionButtons = Array.from(item.querySelectorAll('.cms-gallery-actions button'))
            .map(button => button.getBoundingClientRect());
        return {
            previewRight: preview.right,
            controlsLeft: controls.left,
            controlsRight: controls.right,
            actionRects: actionButtons.map(rect => ({ left: rect.left, right: rect.right, width: rect.width })),
            actionsInsideControls: actionButtons.every(rect => rect.left >= controls.left - 1 && rect.right <= controls.right + 1),
            overflow: document.documentElement.scrollWidth - window.innerWidth
        };
    });
    expect(galleryMetrics.previewRight).toBeLessThanOrEqual(galleryMetrics.controlsLeft + 1);
    expect(galleryMetrics.actionsInsideControls, JSON.stringify(galleryMetrics)).toBe(true);
    expect(galleryMetrics.overflow).toBeLessThanOrEqual(1);

    await generalField.locator('.cms-image-preview').click();
    const lightbox = page.locator('#cms-image-lightbox');
    await expect(lightbox).toBeVisible();
    await expect(lightbox.locator('[data-cms-image-lightbox-image]')).toHaveAttribute('alt', 'Teszt kép');
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
});
