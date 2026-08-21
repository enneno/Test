    async function kepOptimalizalasa(file, options = {}) {
        const maxSide = Number(options.maxSide) || IMAGE_UPLOAD_MAX_SIDE;
        const maxBytes = Number(options.maxBytes) || IMAGE_UPLOAD_MAX_BYTES;
        const kezdoMinoseg = Number(options.quality) || IMAGE_UPLOAD_WEBP_QUALITY;
        let kep;

        try {
            kep = await kepBetoltese(file);
            const outputFormat = await foglalasiCanvasFormatum();
            const originalWidth = kep.width || kep.naturalWidth;
            const originalHeight = kep.height || kep.naturalHeight;
            if (!originalWidth || !originalHeight) throw new Error('A kép méretei nem olvashatók.');

            const kezdoArany = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
            let width = Math.max(1, Math.round(originalWidth * kezdoArany));
            let height = Math.max(1, Math.round(originalHeight * kezdoArany));
            let legkisebbBlob = null;

            for (let meretezes = 0; meretezes < 7; meretezes += 1) {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d', { alpha: !outputFormat.flatten });
                if (!context) throw new Error('A böngésző nem tud képfeldolgozó felületet létrehozni.');
                if (outputFormat.flatten) {
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, width, height);
                }
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = 'high';
                context.drawImage(kep, 0, 0, width, height);

                legkisebbBlob = null;
                for (let quality = kezdoMinoseg; quality >= IMAGE_UPLOAD_MIN_QUALITY - 0.001; quality -= 0.05) {
                    const blob = await canvasBlob(canvas, outputFormat.mimeType, quality);
                    if (!blob || blob.type !== outputFormat.mimeType) {
                        throw new Error(`A böngésző nem tud ${outputFormat.extension.toUpperCase()} képet készíteni.`);
                    }
                    if (!legkisebbBlob || blob.size < legkisebbBlob.size) legkisebbBlob = blob;
                    if (blob.size <= maxBytes) {
                        const nevAlap = String(file.name || 'kep')
                            .replace(/\.[^.]+$/, '')
                            .replace(/[^a-z0-9_-]+/gi, '-')
                            .replace(/^-+|-+$/g, '') || 'kep';
                        const optimizedFile = new File([blob], `${nevAlap}.${outputFormat.extension}`, {
                            type: outputFormat.mimeType,
                            lastModified: Date.now()
                        });
                        return { file: optimizedFile, extension: outputFormat.extension, optimized: true };
                    }
                }

                if (!legkisebbBlob || Math.max(width, height) <= 320) break;
                const celArany = Math.sqrt(maxBytes / legkisebbBlob.size) * 0.92;
                const csokkentes = Math.min(0.86, Math.max(0.58, celArany));
                width = Math.max(1, Math.round(width * csokkentes));
                height = Math.max(1, Math.round(height * csokkentes));
            }

            throw new Error(`A kép nem tömöríthető ${Math.ceil(maxBytes / 1024)} KB alá.`);
        } catch (error) {
            console.error('A foglalási kép optimalizálása nem sikerült:', error);
            throw new Error(`A képet nem sikerült optimalizálni, ezért az eredeti fájlt nem töltöttük fel. ${error?.message || ''}`.trim());
        } finally {
            if (typeof kep?.close === 'function') kep.close();
        }
    }

    async function foglalasiCanvasFormatum() {
        if (!bookingCanvasOutputFormatPromise) {
            bookingCanvasOutputFormatPromise = (async () => {
                const canvas = document.createElement('canvas');
                canvas.width = 2;
                canvas.height = 2;
                const context = canvas.getContext('2d');
                if (!context) throw new Error('A böngésző nem tud képfeldolgozó felületet létrehozni.');
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, 2, 2);
                const webpBlob = await canvasBlob(canvas, 'image/webp', 0.8);
                if (webpBlob?.type === 'image/webp') return { mimeType: 'image/webp', extension: 'webp', flatten: false };
                const jpegBlob = await canvasBlob(canvas, 'image/jpeg', 0.8);
                if (jpegBlob?.type === 'image/jpeg') return { mimeType: 'image/jpeg', extension: 'jpg', flatten: true };
                throw new Error('A böngésző sem WebP-, sem JPG-kódolást nem támogat.');
            })();
        }
        return bookingCanvasOutputFormatPromise;
    }

    async function kepBetoltese(file) {
        if ('createImageBitmap' in window) {
            try {
                return await createImageBitmap(file, { imageOrientation: 'from-image' });
            } catch (error) {
                // Egyes iOS/HEIC esetekben az img fallback megbízhatóbb.
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
                reject(new Error('A kép nem olvasható.'));
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
