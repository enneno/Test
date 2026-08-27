(() => {
    let returnFocus = null;

    const ICONS = {
        imageUp: `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7.3"></path>
                <circle cx="9" cy="9" r="2"></circle>
                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"></path>
                <path d="M19 22v-6"></path>
                <path d="m22 19-3-3-3 3"></path>
            </svg>`,
        plus: `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
            </svg>`,
        trash: `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="m19 6-1 14H6L5 6"></path>
                <path d="M10 11v5"></path>
                <path d="M14 11v5"></path>
            </svg>`,
        up: `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 19V5"></path>
                <path d="m5 12 7-7 7 7"></path>
            </svg>`,
        down: `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 5v14"></path>
                <path d="m19 12-7 7-7-7"></path>
            </svg>`,
        close: `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12"></path>
                <path d="M18 6 6 18"></path>
            </svg>`
    };

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('admin-cms-root');
        if (!root) return;

        root.addEventListener('click', event => {
            const galleryDeleteProxy = event.target.closest('[data-cms-gallery-delete-proxy]');
            if (galleryDeleteProxy) {
                event.preventDefault();
                event.stopImmediatePropagation();
                galleryDeleteProxy.closest('.cms-gallery-item')
                    ?.querySelector('[data-cms-gallery-delete].cms-gallery-delete-source')
                    ?.click();
                return;
            }

            const preview = event.target.closest('.cms-image-preview[data-cms-preview]');
            if (!preview) return;

            if (preview.querySelector('img')) {
                event.preventDefault();
                openLightbox(preview);
                return;
            }

            const upload = galleryUploadInput(preview);
            if (upload) {
                event.preventDefault();
                upload.click();
            }
        });

        root.addEventListener('keydown', event => {
            const preview = event.target.closest('.cms-image-preview[data-cms-preview]');
            if (!preview || (event.key !== 'Enter' && event.key !== ' ')) return;

            if (preview.querySelector('img')) {
                event.preventDefault();
                openLightbox(preview);
                return;
            }

            const upload = galleryUploadInput(preview);
            if (upload) {
                event.preventDefault();
                upload.click();
            }
        });

        const observer = new MutationObserver(enhanceImageWorkspaces);
        observer.observe(root, { childList: true, subtree: true });
        enhanceImageWorkspaces();

        function enhanceImageWorkspaces() {
            placeGalleryActionsInImageControls();
            removeLegacyTallTileControls();
            enhanceImageControls();
            enhancePreviews();
        }

        function placeGalleryActionsInImageControls() {
            root.querySelectorAll('.cms-gallery-item').forEach(item => {
                const imageControls = item.querySelector('.cms-image-field .cms-image-controls');
                if (!imageControls) return;

                const actions = Array.from(item.children)
                    .find(child => child.classList?.contains('cms-gallery-actions'));
                if (actions) imageControls.appendChild(actions);
            });
        }

        function removeLegacyTallTileControls() {
            root.querySelectorAll('.cms-gallery-item').forEach(item => {
                Array.from(item.children).forEach(child => {
                    if (child.querySelector?.('[data-cms-path$=".magas"]')) child.remove();
                });
            });
        }

        function enhanceImageControls() {
            root.querySelectorAll('.cms-image-field').forEach(field => {
                const galleryItem = field.closest('.cms-gallery-item');
                const controls = field.querySelector('.cms-image-controls');
                if (!controls) return;

                const upload = controls.querySelector('.cms-upload-button');
                const remove = controls.querySelector('[data-cms-remove-image]');

                if (galleryItem) {
                    if (upload) {
                        removeTextNodes(upload);
                        upload.classList.remove('cms-icon-button');
                        upload.classList.add('cms-gallery-upload-proxy');
                        upload.setAttribute('aria-hidden', 'true');
                        upload.removeAttribute('title');
                    }

                    if (remove) {
                        remove.dataset.cmsGalleryDeleteProxy = 'true';
                        iconifyButton(remove, 'trash', 'Galériakép törlése', true);
                    }

                    const actions = controls.querySelector('.cms-gallery-actions');
                    const up = actions?.querySelector('[data-cms-gallery-move="up"]');
                    const down = actions?.querySelector('[data-cms-gallery-move="down"]');
                    const deletion = actions?.querySelector('[data-cms-gallery-delete]');
                    const items = Array.from(root.querySelectorAll('.cms-gallery-item'));
                    const index = items.indexOf(galleryItem);

                    if (up) {
                        iconifyButton(up, 'up', 'Feljebb');
                        up.disabled = index <= 0;
                    }
                    if (down) {
                        iconifyButton(down, 'down', 'Lejjebb');
                        down.disabled = index < 0 || index >= items.length - 1;
                    }
                    if (deletion) {
                        deletion.classList.add('cms-gallery-delete-source');
                        deletion.setAttribute('aria-hidden', 'true');
                        deletion.tabIndex = -1;
                    }
                    return;
                }

                if (upload) iconifyUploadLabel(upload, 'imageUp', 'Kép feltöltése');
                if (remove) iconifyButton(remove, 'trash', 'Kép eltávolítása', true);
            });

            const add = root.querySelector('[data-cms-gallery-add]');
            if (add) iconifyButton(add, 'plus', 'Új galériakép');
        }

        function enhancePreviews() {
            root.querySelectorAll('.cms-image-preview[data-cms-preview]').forEach(preview => {
                const hasImage = Boolean(preview.querySelector('img'));
                const canUpload = Boolean(galleryUploadInput(preview));
                preview.classList.toggle('cms-image-preview-interactive', hasImage);
                preview.dataset.cmsUploadTarget = String(!hasImage && canUpload);

                if (hasImage) {
                    preview.setAttribute('role', 'button');
                    preview.tabIndex = 0;
                    preview.setAttribute('aria-label', 'Kép nagyítása');
                    preview.title = 'Kép nagyítása';
                } else if (canUpload) {
                    preview.setAttribute('role', 'button');
                    preview.tabIndex = 0;
                    preview.setAttribute('aria-label', 'Kép feltöltése');
                    preview.title = 'Kép feltöltése';
                } else {
                    preview.removeAttribute('role');
                    preview.removeAttribute('tabindex');
                    preview.removeAttribute('aria-label');
                    preview.removeAttribute('title');
                }
            });
        }
    });

    function galleryUploadInput(preview) {
        return preview.closest('.cms-gallery-item')
            ?.querySelector('.cms-upload-button input[data-cms-upload]') || null;
    }

    function removeTextNodes(element) {
        Array.from(element.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .forEach(node => node.remove());
    }

    function iconifyUploadLabel(label, icon, accessibleLabel) {
        const marker = `${icon}:${accessibleLabel}`;
        if (label.dataset.cmsIconified === marker) return;
        removeTextNodes(label);
        label.querySelector('svg')?.remove();
        label.insertAdjacentHTML('afterbegin', ICONS[icon]);
        label.classList.add('cms-icon-button');
        label.setAttribute('aria-label', accessibleLabel);
        label.title = accessibleLabel;
        label.dataset.cmsIconified = marker;
    }

    function iconifyButton(button, icon, accessibleLabel, danger = false) {
        const marker = `${icon}:${accessibleLabel}:${danger}`;
        if (button.dataset.cmsIconified === marker) return;
        button.innerHTML = ICONS[icon];
        button.classList.add('cms-icon-button');
        button.classList.toggle('cms-icon-button-danger', danger);
        button.setAttribute('aria-label', accessibleLabel);
        button.title = accessibleLabel;
        button.dataset.cmsIconified = marker;
    }

    function ensureLightbox() {
        let lightbox = document.getElementById('cms-image-lightbox');
        if (lightbox) return lightbox;

        lightbox = document.createElement('div');
        lightbox.id = 'cms-image-lightbox';
        lightbox.className = 'cms-image-lightbox';
        lightbox.hidden = true;
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Kép nagyított megtekintése');
        lightbox.innerHTML = `
            <button type="button" class="cms-image-lightbox-close" data-cms-image-lightbox-close aria-label="Nagyított kép bezárása" title="Bezárás">${ICONS.close}</button>
            <div class="cms-image-lightbox-stage">
                <img class="cms-image-lightbox-image" data-cms-image-lightbox-image alt="">
            </div>
        `;

        lightbox.addEventListener('click', event => {
            if (event.target === lightbox || event.target.closest('[data-cms-image-lightbox-close]')) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
        });

        document.body.appendChild(lightbox);
        return lightbox;
    }

    function openLightbox(preview) {
        const source = preview.querySelector('img');
        if (!source) return;

        const lightbox = ensureLightbox();
        const image = lightbox.querySelector('[data-cms-image-lightbox-image]');
        image.src = source.currentSrc || source.src;
        image.alt = source.alt || 'Nagyított kép';
        returnFocus = preview;
        lightbox.hidden = false;
        document.body.classList.add('cms-image-lightbox-open');
        requestAnimationFrame(() => lightbox.querySelector('[data-cms-image-lightbox-close]')?.focus({ preventScroll: true }));
    }

    function closeLightbox() {
        const lightbox = document.getElementById('cms-image-lightbox');
        if (!lightbox || lightbox.hidden) return;
        lightbox.hidden = true;
        document.body.classList.remove('cms-image-lightbox-open');
        returnFocus?.focus?.({ preventScroll: true });
        returnFocus = null;
    }
})();
