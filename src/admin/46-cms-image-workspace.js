(() => {
    let returnFocus = null;

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('admin-cms-root');
        if (!root) return;

        root.addEventListener('click', event => {
            const preview = event.target.closest('.cms-image-preview[data-cms-preview]');
            if (!preview || !preview.querySelector('img')) return;
            event.preventDefault();
            openLightbox(preview);
        });

        root.addEventListener('keydown', event => {
            const preview = event.target.closest('.cms-image-preview[data-cms-preview]');
            if (!preview || !preview.querySelector('img')) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openLightbox(preview);
        });

        const observer = new MutationObserver(enhancePreviews);
        observer.observe(root, { childList: true, subtree: true });
        enhancePreviews();

        function enhancePreviews() {
            root.querySelectorAll('.cms-image-preview[data-cms-preview]').forEach(preview => {
                const hasImage = Boolean(preview.querySelector('img'));
                preview.classList.toggle('cms-image-preview-interactive', hasImage);
                if (hasImage) {
                    preview.setAttribute('role', 'button');
                    preview.tabIndex = 0;
                    preview.setAttribute('aria-label', 'Kép nagyítása');
                    preview.title = 'Kattints a kép nagyításához';
                } else {
                    preview.removeAttribute('role');
                    preview.removeAttribute('tabindex');
                    preview.removeAttribute('aria-label');
                    preview.removeAttribute('title');
                }
            });
        }
    });

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
            <button type="button" class="cms-image-lightbox-close" data-cms-image-lightbox-close aria-label="Nagyított kép bezárása">×</button>
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
