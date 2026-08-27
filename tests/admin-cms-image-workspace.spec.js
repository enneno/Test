const { test, expect } = require('playwright/test');
const fs = require('fs');
const path = require('path');

function source(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('shared CMS image workspace uses icon controls, removes legacy tall tile UI, and keeps gallery actions beside the preview', async ({ page }) => {
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
    const contentCss = source('src/admin-styles/40-content-editor.css');
    const imageControlsCss = source('src/admin-styles/42-cms-image-controls.css');
    const galleryCss = source('src/admin-styles/45-gallery-editor.css');
    const imageWorkspaceJs = source('src/admin/46-cms-image-workspace.js');

    expect(contentCss).not.toContain('!important');
    expect(imageControlsCss).not.toContain('!important');
    expect(galleryCss).not.toContain('!important');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<!doctype html>
        <html>
        <head>
            <style>${adminCss}</style>
        </head>
        <body class="admin-body admin-v2">
            <main id="admin-tartalom">
                <div id="admin-panel-szovegek" class="admin-panel aktiv">
                    <div id="admin-cms-root">
                        <div class="cms-image-field admin-mezo admin-mezo-szeles" data-test-general-image>
                            <span class="cms-field-label">Nyitókép</span>
                            <div class="cms-image-preview" data-cms-preview="fooldal.hero.kep">
                                <img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22800%22%3E%3Crect width=%22600%22 height=%22800%22 fill=%22%23d9aaa7%22/%3E%3C/svg%3E" alt="Teszt kép">
                                <span>Kép előnézet</span>
                            </div>
                            <div class="cms-image-controls">
                                <label class="admin-hozzaadas cms-upload-button">Kép feltöltése<input type="file" data-cms-upload="fooldal.hero.kep"></label>
                                <button type="button" class="admin-kis-gomb" data-cms-remove-image="fooldal.hero.kep">Kép eltávolítása</button>
                            </div>
                            <input class="cms-image-url" value="/kepek/teszt.jpg">
                        </div>

                        <div class="cms-gallery-header">
                            <div><h3>Galéria képei</h3></div>
                            <button type="button" class="admin-hozzaadas" data-cms-gallery-add>Új galériakép</button>
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
                                    <label class="admin-hozzaadas cms-upload-button">Kép feltöltése<input type="file" data-cms-upload="galeria.elemek.0.kep"></label>
                                    <button type="button" class="admin-kis-gomb" data-cms-remove-image="galeria.elemek.0.kep">Kép eltávolítása</button>
                                </div>
                                <input class="cms-image-url" value="/kepek/galeria.jpg">
                            </div>
                            <label class="admin-mezo"><span>Kép leírása</span><input data-cms-path="galeria.elemek.0.kepAlt"></label>
                            <label class="admin-mezo"><input type="checkbox" data-cms-path="galeria.elemek.0.magas"><span>Magas kiemelt csempe</span></label>
                            <div class="cms-gallery-actions">
                                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="up" data-index="0">↑ Feljebb</button>
                                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="down" data-index="0">↓ Lejjebb</button>
                                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-cms-gallery-delete="0">Törlés</button>
                            </div>
                        </article>

                        <article class="cms-gallery-item" data-test-empty-gallery-image>
                            <h4>2. kép</h4>
                            <label class="cms-gallery-home-choice"><input type="checkbox"><span>Megjelenjen a főoldali galériaátvezetőben</span></label>
                            <div class="cms-image-field admin-mezo admin-mezo-szeles">
                                <span class="cms-field-label">Fotó</span>
                                <div class="cms-image-preview" data-cms-preview="galeria.elemek.1.kep"><span>Nincs kiválasztott kép</span></div>
                                <div class="cms-image-controls">
                                    <label class="admin-hozzaadas cms-upload-button">Kép feltöltése<input type="file" data-cms-upload="galeria.elemek.1.kep"></label>
                                    <button type="button" class="admin-kis-gomb" data-cms-remove-image="galeria.elemek.1.kep">Kép eltávolítása</button>
                                </div>
                            </div>
                            <label class="admin-mezo"><span>Kép leírása</span><input data-cms-path="galeria.elemek.1.kepAlt"></label>
                            <div class="cms-gallery-actions">
                                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="up" data-index="1">↑ Feljebb</button>
                                <button type="button" class="admin-kis-gomb" data-cms-gallery-move="down" data-index="1">↓ Lejjebb</button>
                                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-cms-gallery-delete="1">Törlés</button>
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
    await expect(generalField.locator('.cms-upload-button')).toHaveAttribute('aria-label', 'Kép feltöltése');
    await expect(generalField.locator('[data-cms-remove-image]')).toHaveAttribute('aria-label', 'Kép eltávolítása');
    await expect(generalField.locator('.cms-icon-button svg')).toHaveCount(2);
    expect(await generalField.locator('.cms-image-controls').innerText()).toBe('');

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

    await expect(page.locator('[data-cms-gallery-add]')).toHaveAttribute('aria-label', 'Új galériakép');
    await expect(page.locator('[data-cms-gallery-add] svg')).toHaveCount(1);
    expect(await page.locator('[data-cms-gallery-add]').innerText()).toBe('');

    const galleryItem = page.locator('[data-test-gallery-image]');
    const galleryControls = galleryItem.locator('.cms-image-controls');
    await expect(galleryControls.locator(':scope > .cms-gallery-actions')).toHaveCount(1);
    await expect(galleryItem.locator(':scope > .cms-gallery-actions')).toHaveCount(0);
    await expect(galleryItem.locator('[data-cms-path$=".magas"]')).toHaveCount(0);
    await expect(galleryControls.locator('.cms-upload-button')).toHaveClass(/cms-gallery-upload-proxy/);
    await expect(galleryControls.locator('[data-cms-remove-image]')).toHaveAttribute('aria-label', 'Galériakép törlése');
    await expect(galleryControls.locator('[data-cms-gallery-delete]')).toHaveClass(/cms-gallery-delete-source/);
    await expect(galleryControls.locator('.cms-icon-button:not(.cms-gallery-delete-source)')).toHaveCount(3);
    await expect(galleryControls.locator('[data-cms-gallery-move="up"]')).toBeDisabled();
    await expect(galleryControls.locator('[data-cms-gallery-move="down"]')).toBeEnabled();

    const galleryMetrics = await galleryItem.evaluate(item => {
        const preview = item.querySelector('.cms-image-preview').getBoundingClientRect();
        const controls = item.querySelector('.cms-image-controls').getBoundingClientRect();
        const visibleButtons = Array.from(item.querySelectorAll('.cms-image-controls .cms-icon-button'))
            .filter(button => !button.classList.contains('cms-gallery-delete-source'))
            .map(button => button.getBoundingClientRect());
        return {
            previewRight: preview.right,
            controlsLeft: controls.left,
            controlsRight: controls.right,
            actionsInsideControls: visibleButtons.every(rect => rect.left >= controls.left - 1 && rect.right <= controls.right + 1),
            overflow: document.documentElement.scrollWidth - window.innerWidth
        };
    });
    expect(galleryMetrics.previewRight).toBeLessThanOrEqual(galleryMetrics.controlsLeft + 1);
    expect(galleryMetrics.actionsInsideControls, JSON.stringify(galleryMetrics)).toBe(true);
    expect(galleryMetrics.overflow).toBeLessThanOrEqual(1);

    const emptyPreview = page.locator('[data-test-empty-gallery-image] .cms-image-preview');
    await expect(emptyPreview).toHaveAttribute('role', 'button');
    await expect(emptyPreview).toHaveAttribute('aria-label', 'Kép feltöltése');

    await generalField.locator('.cms-image-preview').click();
    const lightbox = page.locator('#cms-image-lightbox');
    await expect(lightbox).toBeVisible();
    await expect(lightbox.locator('[data-cms-image-lightbox-image]')).toHaveAttribute('alt', 'Teszt kép');
    await expect(lightbox.locator('[data-cms-image-lightbox-close] svg')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(lightbox).toBeHidden();
});
