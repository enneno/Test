(() => {
    const GALLERY_GROUP = '7';
    const GALLERY_PAGE_SIZES = [10, 20, 'all'];
    let galleryMode = false;
    let internalSwitch = false;
    let refreshQueued = false;
    let galleryPage = 1;
    let galleryPageSize = 10;

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

            const pageButton = event.target.closest('[data-lumi-gallery-page]');
            if (pageButton) {
                event.preventDefault();
                const direction = pageButton.dataset.lumiGalleryPage;
                galleryPage += direction === 'prev' ? -1 : 1;
                queueRefresh(root);
                return;
            }

            const addButton = event.target.closest('[data-cms-gallery-add]');
            if (addButton) {
                const previousCount = root.querySelectorAll('.cms-gallery-item').length;
                galleryPage = 1;
                setTimeout(() => promoteNewestGalleryItem(root, previousCount), 0);
                return;
            }

            if (!internalSwitch && event.target.closest('[data-cms-view]')) {
                galleryMode = false;
                galleryPage = 1;
                queueRefresh(root);
            }
        }, true);

        root.addEventListener('change', event => {
            const pageSizeSelect = event.target.closest('[data-lumi-gallery-page-size]');
            if (pageSizeSelect) {
                const value = pageSizeSelect.value;
                galleryPageSize = value === 'all' ? 'all' : Number.parseInt(value, 10);
                if (!GALLERY_PAGE_SIZES.some(size => String(size) === String(galleryPageSize))) {
                    galleryPageSize = 10;
                }
                galleryPage = 1;
                queueRefresh(root);
                return;
            }

            const sectionSelect = event.target.closest('[data-cms-section-select]');
            if (!sectionSelect || internalSwitch) return;
            if (galleryMode && sectionSelect.value !== GALLERY_GROUP) galleryMode = false;
            galleryPage = 1;
            queueRefresh(root);
        }, true);

        const observer = new MutationObserver(() => queueRefresh(root));
        observer.observe(root, { childList: true, subtree: true });
        queueRefresh(root);
    });

    function openGallery(root) {
        galleryMode = true;
        galleryPage = 1;
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

            moveHomepageChoicesIntoControls(root);
            renderGalleryPagination(root);
            return;
        }

        root.querySelector('[data-lumi-gallery-pagination]')?.remove();
        root.querySelectorAll('.cms-gallery-item[hidden]').forEach(item => {
            item.hidden = false;
        });
    }

    function moveHomepageChoicesIntoControls(root) {
        root.querySelectorAll('.cms-gallery-item').forEach(item => {
            const controls = item.querySelector('.cms-image-controls');
            const choice = Array.from(item.children)
                .find(child => child.classList?.contains('cms-gallery-home-choice'));
            if (!controls || !choice) return;

            const label = choice.querySelector('span');
            if (label) label.textContent = 'Megjelenjen a főoldalon';
            controls.prepend(choice);
        });
    }

    function renderGalleryPagination(root) {
        const header = root.querySelector('.cms-gallery-header');
        const list = root.querySelector('.cms-gallery-list');
        if (!header || !list) return;

        let pagination = header.querySelector('[data-lumi-gallery-pagination]');
        if (!pagination) {
            pagination = document.createElement('div');
            pagination.className = 'cms-gallery-pagination';
            pagination.dataset.lumiGalleryPagination = 'true';
            pagination.innerHTML = `
                <div class="cms-gallery-page-nav" aria-label="Galéria oldalak">
                    <button type="button" class="cms-gallery-page-button" data-lumi-gallery-page="prev" aria-label="Előző galériaoldal" title="Előző oldal">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"></path></svg>
                    </button>
                    <span class="cms-gallery-page-label" data-lumi-gallery-page-label>1 / 1</span>
                    <button type="button" class="cms-gallery-page-button" data-lumi-gallery-page="next" aria-label="Következő galériaoldal" title="Következő oldal">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"></path></svg>
                    </button>
                </div>
                <label class="cms-gallery-page-size">
                    <span>Oldalanként</span>
                    <select class="admin-oldalmeret-select" data-lumi-gallery-page-size aria-label="Oldalanként">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="all">Összes</option>
                    </select>
                </label>
            `;

            const addButton = header.querySelector('[data-cms-gallery-add]');
            if (addButton) header.insertBefore(pagination, addButton);
            else header.appendChild(pagination);
        }

        const items = Array.from(list.querySelectorAll(':scope > .cms-gallery-item'));
        const total = items.length;
        const size = galleryPageSize === 'all'
            ? Math.max(1, total)
            : Math.max(1, Number.parseInt(galleryPageSize, 10) || 10);
        const totalPages = total ? Math.max(1, Math.ceil(total / size)) : 1;
        galleryPage = Math.min(Math.max(1, galleryPage), totalPages);
        const start = galleryPageSize === 'all' ? 0 : (galleryPage - 1) * size;
        const end = galleryPageSize === 'all' ? total : start + size;

        items.forEach((item, index) => {
            item.hidden = index < start || index >= end;
        });

        const select = pagination.querySelector('[data-lumi-gallery-page-size]');
        if (select) select.value = String(galleryPageSize);

        const label = pagination.querySelector('[data-lumi-gallery-page-label]');
        if (label) label.textContent = total ? `${galleryPage} / ${totalPages}` : '0 / 0';

        const previous = pagination.querySelector('[data-lumi-gallery-page="prev"]');
        const next = pagination.querySelector('[data-lumi-gallery-page="next"]');
        if (previous) previous.disabled = !total || galleryPage <= 1;
        if (next) next.disabled = !total || galleryPage >= totalPages;
    }

    function promoteNewestGalleryItem(root, previousCount) {
        const items = Array.from(root.querySelectorAll('.cms-gallery-item'));
        if (items.length !== previousCount + 1) {
            queueRefresh(root);
            return;
        }

        for (let index = items.length - 1; index > 0; index -= 1) {
            const moveUp = root.querySelector(`[data-cms-gallery-move="up"][data-index="${index}"]`);
            if (!moveUp) break;
            moveUp.click();
        }

        galleryPage = 1;
        queueRefresh(root);
    }
})();
