from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing expected block: {label}')
    return text.replace(old, new, 1)


content_css_path = Path('src/admin-styles/40-content-editor.css')
content_css = content_css_path.read_text(encoding='utf-8')

content_css = replace_once(
    content_css,
    '''.cms-image-field {\n  padding: 16px;\n  border: 1px solid rgba(185, 133, 143, .28);\n  border-radius: 18px;\n  background: rgba(255, 250, 244, .72);\n}\n.cms-image-preview {\n  display: grid;\n  width: min(100%, 420px);\n  min-height: 150px;\n  place-items: center;\n  overflow: hidden;\n  border: 1px solid rgba(185, 133, 143, .24);\n  border-radius: 14px;\n  color: var(--szoveg);\n  background: var(--krem);\n}\n.cms-image-preview img { width: 100%; max-height: 280px; object-fit: contain; }\n.cms-image-preview img + span { display: none; }''',
    '''.cms-image-field {\n  display: grid;\n  grid-template-columns: minmax(132px, 180px) minmax(0, 1fr);\n  grid-template-areas:\n    "label label"\n    "preview controls"\n    "url url";\n  align-items: start;\n  gap: 10px 12px;\n  padding: 16px;\n  border: 1px solid rgba(185, 133, 143, .28);\n  border-radius: 18px;\n  background: rgba(255, 250, 244, .72);\n}\n.cms-image-field > .cms-field-label { grid-area: label; }\n.cms-image-preview {\n  grid-area: preview;\n  position: relative;\n  display: grid;\n  width: 100%;\n  min-width: 0;\n  min-height: 0;\n  aspect-ratio: 4 / 5;\n  place-items: center;\n  overflow: hidden;\n  border: 1px solid rgba(185, 133, 143, .24);\n  border-radius: 14px;\n  color: var(--szoveg);\n  background: var(--krem);\n}\n.cms-image-preview img { width: 100%; height: 100%; max-height: none; object-fit: contain; }\n.cms-image-preview img + span { display: none; }\n.cms-image-preview-interactive { cursor: zoom-in; }\n.cms-image-preview-interactive:focus-visible {\n  outline: 2px solid var(--admin-v2-brand);\n  outline-offset: 3px;\n}\n.cms-image-controls {\n  grid-area: controls;\n  display: grid;\n  align-content: start;\n  align-items: stretch;\n  gap: 8px;\n}\n.cms-image-controls > :is(.cms-upload-button, button) {\n  width: 100%;\n  min-width: 0;\n  min-height: 36px;\n  padding-inline: 10px;\n  white-space: normal;\n}\n.cms-image-url { grid-area: url; }''',
    'shared CMS image field geometry'
)

content_css = replace_once(
    content_css,
    '''.cms-image-url { font-size: var(--lumi-font-label); }\n.cms-gallery-editor {''',
    '''.cms-image-url { font-size: var(--lumi-font-label); }\nbody.cms-image-lightbox-open { overflow: hidden; }\n.cms-image-lightbox[hidden] { display: none; }\n.cms-image-lightbox {\n  position: fixed;\n  z-index: 320;\n  inset: 0;\n  display: grid;\n  place-items: center;\n  padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));\n  background: rgba(32, 25, 23, .88);\n  backdrop-filter: blur(12px);\n}\n.cms-image-lightbox-stage {\n  display: grid;\n  width: 100%;\n  height: 100%;\n  place-items: center;\n  overflow: auto;\n  overscroll-behavior: contain;\n}\n.cms-image-lightbox-image {\n  display: block;\n  max-width: min(1100px, calc(100vw - 32px));\n  max-height: calc(100dvh - 40px - max(32px, env(safe-area-inset-top, 0px)) - max(32px, env(safe-area-inset-bottom, 0px)));\n  border-radius: 12px;\n  object-fit: contain;\n  box-shadow: 0 20px 70px rgba(0, 0, 0, .34);\n}\n.cms-image-lightbox-close {\n  position: fixed;\n  z-index: 1;\n  top: max(14px, env(safe-area-inset-top, 0px));\n  right: max(14px, env(safe-area-inset-right, 0px));\n  display: grid;\n  width: 44px;\n  height: 44px;\n  padding: 0;\n  place-items: center;\n  border: 1px solid rgba(255, 255, 255, .22);\n  border-radius: 999px;\n  color: #fff;\n  background: rgba(45, 34, 31, .72);\n  font-family: inherit;\n  font-size: 30px;\n  font-weight: 300;\n  line-height: 1;\n  cursor: pointer;\n}\n.cms-gallery-editor {''',
    'shared CMS image lightbox'
)

content_css = replace_once(
    content_css,
    '''.admin-body.admin-v2 #admin-panel-szovegek .cms-image-field {\n  padding: 12px;\n  border: 1px solid var(--admin-v2-border);\n  border-radius: 12px;\n  background: var(--admin-v2-surface-soft);\n}\n.admin-body.admin-v2 #admin-panel-szovegek .cms-image-preview { width: 100%; min-height: 110px; border-radius: 10px; }\n.admin-body.admin-v2 #admin-panel-szovegek .cms-image-preview img { max-height: 220px; }''',
    '''.admin-body.admin-v2 #admin-panel-szovegek .cms-image-field {\n  display: grid;\n  grid-template-columns: minmax(132px, 180px) minmax(0, 1fr);\n  padding: 12px;\n  border: 1px solid var(--admin-v2-border);\n  border-radius: 12px;\n  background: var(--admin-v2-surface-soft);\n}\n.admin-body.admin-v2 #admin-panel-szovegek .cms-image-preview {\n  width: 100%;\n  max-width: 180px;\n  min-height: 0;\n  aspect-ratio: 4 / 5;\n  border-radius: 10px;\n}\n.admin-body.admin-v2 #admin-panel-szovegek .cms-image-preview img {\n  width: 100%;\n  height: 100%;\n  max-height: none;\n  object-fit: contain;\n}''',
    'v2 CMS image component sizing'
)

content_css = replace_once(
    content_css,
    '''  .admin-body.admin-v2 #admin-panel-szovegek .cms-editor-card { border-radius: 13px; }\n  .admin-body.admin-v2 #admin-panel-szovegek .cms-fieldset-grid,''',
    '''  .admin-body.admin-v2 #admin-panel-szovegek .cms-editor-card { border-radius: 13px; }\n  .admin-body.admin-v2 #admin-panel-szovegek .cms-image-field {\n    display: grid;\n    grid-template-columns: minmax(112px, 40%) minmax(0, 1fr);\n    gap: 9px 10px;\n  }\n  .admin-body.admin-v2 #admin-panel-szovegek .cms-image-preview { max-width: none; }\n  .admin-body.admin-v2 #admin-panel-szovegek .cms-image-controls > :is(.cms-upload-button, button) {\n    min-height: 38px;\n    padding-inline: 8px;\n    font-size: 10px;\n  }\n  .admin-body.admin-v2 #admin-panel-szovegek .cms-fieldset-grid,''',
    'mobile CMS image component sizing'
)

content_css_path.write_text(content_css, encoding='utf-8')


gallery_css_path = Path('src/admin-styles/45-gallery-editor.css')
gallery_css = gallery_css_path.read_text(encoding='utf-8')

gallery_css = replace_once(
    gallery_css,
    '''.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-field > .cms-field-label,\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-url,\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-controls > button {\n  display: none;\n}\n\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-preview {''',
    '''.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-field > .cms-field-label,\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-url {\n  display: none;\n}\n\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-field {\n  display: grid;\n  grid-template-columns: minmax(112px, 42%) minmax(0, 1fr);\n  grid-template-areas: "preview controls";\n  align-items: start;\n  gap: 9px;\n}\n\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-preview {''',
    'gallery image controls visibility and layout'
)

gallery_css = replace_once(
    gallery_css,
    '''.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-controls {\n  display: block;\n}\n\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-upload-button {\n  width: 100%;\n}''',
    '''.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-controls {\n  display: grid;\n  align-content: start;\n  gap: 7px;\n}\n\n.admin-body.admin-v2 #admin-panel-szovegek #admin-cms-root[data-lumi-cms-gallery-context="images"] .cms-image-controls > :is(.cms-upload-button, button) {\n  width: 100%;\n}''',
    'gallery image control stack'
)

gallery_css_path.write_text(gallery_css, encoding='utf-8')


test_path = Path('tests/admin-production-redesign.spec.js')
test = test_path.read_text(encoding='utf-8')
insert_at = test.rfind('\n});')
if insert_at == -1:
    raise SystemExit('Could not find end of production admin describe block')

new_tests = r'''

    for (const mode of [
        { name: 'mobile browser', standalone: false },
        { name: 'standalone app', standalone: true }
    ]) {
        test(`${mode.name}: CMS image uploads share compact side-by-side controls and a lightbox`, async ({ page }) => {
            const browserErrors = await openAdmin(page, { width: 390, height: 844 }, { standalone: mode.standalone });

            await page.evaluate(() => document.querySelector('.admin-sidebar [data-admin-v2-nav="weboldal"]')?.click());
            await expect(page.locator('#admin-panel-szovegek')).toHaveClass(/aktiv/);
            await expect(page.locator('#admin-cms-root')).toBeVisible();

            const galleryTab = page.locator('[data-lumi-cms-gallery-tab]');
            await expect(galleryTab).toBeVisible();
            await galleryTab.click();
            await expect(page.locator('#admin-cms-root')).toHaveAttribute('data-lumi-cms-gallery-context', 'images');

            if (await page.locator('.cms-gallery-item').count() === 0) {
                await page.locator('[data-cms-gallery-add]').click();
            }

            const imageField = page.locator('.cms-gallery-item .cms-image-field').first();
            const preview = imageField.locator('.cms-image-preview');
            const controls = imageField.locator('.cms-image-controls');
            await expect(imageField).toBeVisible();
            await expect(preview).toBeVisible();
            await expect(controls.locator('.cms-upload-button')).toBeVisible();
            await expect(controls.locator('[data-cms-remove-image]')).toBeVisible();

            const metrics = await imageField.evaluate(field => {
                const fieldRect = field.getBoundingClientRect();
                const previewRect = field.querySelector('.cms-image-preview').getBoundingClientRect();
                const controlsRect = field.querySelector('.cms-image-controls').getBoundingClientRect();
                return {
                    fieldWidth: fieldRect.width,
                    previewWidth: previewRect.width,
                    previewRight: previewRect.right,
                    controlsLeft: controlsRect.left,
                    documentOverflow: document.documentElement.scrollWidth - window.innerWidth
                };
            });
            expect(metrics.previewWidth).toBeLessThan(metrics.fieldWidth * 0.55);
            expect(metrics.previewRight).toBeLessThanOrEqual(metrics.controlsLeft + 1);
            expect(metrics.documentOverflow).toBeLessThanOrEqual(1);

            await preview.evaluate(node => {
                node.innerHTML = '<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22800%22%3E%3Crect width=%22600%22 height=%22800%22 fill=%22%23d9aaa7%22/%3E%3C/svg%3E" alt="Teszt kép"><span>Kép előnézet</span>';
            });
            await expect(preview).toHaveAttribute('role', 'button');
            await expect(preview).toHaveAttribute('aria-label', 'Kép nagyítása');

            await preview.click();
            const lightbox = page.locator('#cms-image-lightbox');
            await expect(lightbox).toBeVisible();
            await expect(lightbox.locator('[data-cms-image-lightbox-image]')).toHaveAttribute('alt', 'Teszt kép');
            await page.keyboard.press('Escape');
            await expect(lightbox).toBeHidden();

            expect(browserErrors).toEqual([]);
        });
    }
'''

test = test[:insert_at] + new_tests + test[insert_at:]
test_path.write_text(test, encoding='utf-8')
