(() => {
    const GALLERY_GROUP = '7';
    let galleryMode = false;
    let internalSwitch = false;
    let refreshQueued = false;

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('admin-cms-root');
        if (!root) return;

        root.addEventListener('click', event => {
            const galleryTab = event.target.closest('[data-lumi-cms-gallery-tab]');
            if (galleryTab) {
                event.preventDefault();
                openGallery(root);
                return;
            }

            if (!internalSwitch && event.target.closest('[data-cms-view]')) {
                galleryMode = false;
                queueRefresh(root);
            }
        }, true);

        root.addEventListener('change', event => {
            const sectionSelect = event.target.closest('[data-cms-section-select]');
            if (!sectionSelect || internalSwitch) return;
            if (galleryMode && sectionSelect.value !== GALLERY_GROUP) galleryMode = false;
            queueRefresh(root);
        }, true);

        const observer = new MutationObserver(() => queueRefresh(root));
        observer.observe(root, { childList: true, subtree: true });
        queueRefresh(root);
    });

    function openGallery(root) {
        galleryMode = true;
        const oldalakTab = root.querySelector('[data-cms-view="oldalak"]');
        if (!oldalakTab) return;

        internalSwitch = true;
        oldalakTab.click();
        internalSwitch = false;

        const sectionSelect = root.querySelector('[data-cms-section-select]');
        if (sectionSelect && sectionSelect.value !== GALLERY_GROUP) {
            internalSwitch = true;
            sectionSelect.value = GALLERY_GROUP;
            sectionSelect.dispatchEvent(new Event('change', { bubbles: true }));
            internalSwitch = false;
        }

        queueRefresh(root);
    }

    function queueRefresh(root) {
        if (refreshQueued) return;
        refreshQueued = true;
        requestAnimationFrame(() => {
            refreshQueued = false;
            enhance(root);
        });
    }

    function enhance(root) {
        const tabs = root.querySelector('.cms-view-tabs');
        if (!tabs) return;

        let galleryTab = tabs.querySelector('[data-lumi-cms-gallery-tab]');
        if (!galleryTab) {
            galleryTab = document.createElement('button');
            galleryTab.type = 'button';
            galleryTab.className = 'cms-view-tab cms-view-tab-gallery';
            galleryTab.dataset.lumiCmsGalleryTab = 'true';
            galleryTab.setAttribute('role', 'tab');
            galleryTab.setAttribute('aria-selected', 'false');
            galleryTab.innerHTML = '<span>Galéria képek</span>';

            const oldalakTab = tabs.querySelector('[data-cms-view="oldalak"]');
            if (oldalakTab) oldalakTab.insertAdjacentElement('afterend', galleryTab);
            else tabs.appendChild(galleryTab);
        }

        const sectionSelect = root.querySelector('[data-cms-section-select]');
        const galleryGroupOpen = sectionSelect?.value === GALLERY_GROUP;
        const context = galleryMode && galleryGroupOpen
            ? 'images'
            : galleryGroupOpen
                ? 'page'
                : '';

        if (context) root.dataset.lumiCmsGalleryContext = context;
        else delete root.dataset.lumiCmsGalleryContext;

        galleryTab.setAttribute('aria-selected', String(context === 'images'));
        galleryTab.classList.toggle('is-gallery-active', context === 'images');

        if (context === 'images') {
            tabs.querySelectorAll('[data-cms-view]').forEach(button => {
                button.setAttribute('aria-selected', 'false');
            });

            const title = root.querySelector('.cms-editor-card-header h3');
            if (title) title.textContent = 'Galéria képek';
        }
    }
})();
