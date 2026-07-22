    async function kepOptimalizalasa(file, options = {}) {
        const eredetiExt = kepKiterjesztes(file);
        const eredeti = { file, extension: eredetiExt, optimized: false };
        const type = String(file.type || '').toLowerCase();
        const name = String(file.name || '').toLowerCase();

        if (type === 'image/gif' || name.endsWith('.gif')) return eredeti;

        try {
            const maxSide = Number(options.maxSide) || IMAGE_UPLOAD_MAX_SIDE;
            const quality = Number(options.quality) || IMAGE_UPLOAD_WEBP_QUALITY;
            const kep = await kepBetoltese(file);
            const width = kep.width || kep.naturalWidth;
            const height = kep.height || kep.naturalHeight;

            if (!width || !height) return eredeti;

            const scale = Math.min(1, maxSide / Math.max(width, height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const context = canvas.getContext('2d', { alpha: true });
            if (!context) return eredeti;

            context.drawImage(kep, 0, 0, canvas.width, canvas.height);
            if (typeof kep.close === 'function') kep.close();

            const blob = await canvasBlob(canvas, 'image/webp', quality);
            if (!blob) return eredeti;

            if (scale >= 1 && blob.size > file.size * 1.05) return eredeti;

            const nevAlap = String(file.name || 'kep').replace(/\.[^.]+$/, '') || 'kep';
            const webpFile = new File([blob], `${nevAlap}.webp`, { type: 'image/webp', lastModified: Date.now() });
            return { file: webpFile, extension: 'webp', optimized: true };
        } catch (error) {
            console.warn('K?p optimaliz?l?sa nem siker?lt, eredeti f?jl ker?l felt?lt?sre:', error);
            return eredeti;
        }
    }

    async function kepBetoltese(file) {
        if ('createImageBitmap' in window) {
            try {
                return await createImageBitmap(file, { imageOrientation: 'from-image' });
            } catch (error) {
                // Egyes iOS/HEIC esetekben az img fallback megb?zhat?bb.
            }
        }

        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('A k?p nem olvashat?.'));
            };
            img.src = url;
        });
    }

    function canvasBlob(canvas, type, quality) {
        return new Promise(resolve => canvas.toBlob(resolve, type, quality));
    }

    function kepKiterjesztes(file) {
        const nevExt = String(file.name || '').split('.').pop()?.toLowerCase();
        if (nevExt && /^[a-z0-9]+$/.test(nevExt)) return nevExt === 'jpeg' ? 'jpg' : nevExt;
        return ({
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/avif': 'avif',
            'image/heic': 'heic',
            'image/heif': 'heif'
        })[file.type] || 'jpg';
    }

    function randomAzonosito() {
        if (window.crypto?.getRandomValues) {
            const tomb = new Uint32Array(2);
            window.crypto.getRandomValues(tomb);
            return Array.from(tomb).map(szam => szam.toString(36)).join('');
        }
        return Math.random().toString(36).slice(2, 12);
    }

    function icsDatum(datum) {
        return datum.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }

    function icsSzoveg(szoveg) {
        return String(szoveg || '')
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    }

    function supabaseHiba(error) {
        if (typeof error === 'string' && error.trim()) return error.trim();
        const uzenet = error?.message || '';
        if (uzenet) return uzenet;
        if (typeof error?.error === 'string' && error.error.trim()) return error.error.trim();
        return 'Most nem sikerült elküldeni a foglalást. Kérlek próbáld újra.';
    }

    function maiDatum() {
        const ma = new Date();
        const ev = ma.getFullYear();
        const honap = String(ma.getMonth() + 1).padStart(2, '0');
        const nap = String(ma.getDate()).padStart(2, '0');
        return `${ev}-${honap}-${nap}`;
    }

    function html(ertek) {
        return String(ertek ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
