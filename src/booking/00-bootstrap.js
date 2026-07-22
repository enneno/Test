(function () {
    'use strict';

    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const MEDIA_BUCKET = 'site-media';
    const INSPIRATION_FOLDER = 'booking-inspirations';
    const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
    const MAX_IMAGE_COUNT = 5;
    const IMAGE_UPLOAD_MAX_SIDE = 1600;
    const IMAGE_UPLOAD_WEBP_QUALITY = 0.84;
    const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

    if (!document.body || document.body.dataset.bookingMode !== 'supabase') {
        return;
    }

    const allapot = {
        kliens: null,
        szolgaltatasok: [],
        kuponok: [],
        aktivKupon: null,
        kuponEllenorzesAzonosito: 0,
        kepPreviewUrls: []
    };

    document.addEventListener('DOMContentLoaded', () => {
        const elemek = urlapElemek();

        if (!elemek.urlap) {
            return;
        }

        kapcsolatLinkekFrissitese();
        window.setTimeout(kapcsolatLinkekFrissitese, 900);
        feluletBekotese(elemek);
        osszefoglaloFrissitese(elemek);

        if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
            statuszKiirasa(elemek.statusz, 'A foglalási rendszer még nincs összekötve a Supabase projekttel.', true);
            mezokTiltasa(elemek, true);
            return;
        }

        allapot.kliens = window.lumiSupabaseClient();

        elemek.urlap.addEventListener('submit', event => {
            event.preventDefault();
            foglalasKuldes(elemek).catch(error => {
                console.error('Lumi Nails foglalás beküldési hiba:', error);
                statuszKiirasa(elemek.statusz, supabaseHiba(error), true);
                kovetkezoReszhezGordit(elemek.statusz, 0);
                gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
            });
        });

        elemek.szolgaltatas.addEventListener('change', () => {
            kuponSzolgaltatasValtozott(elemek);
            szabadDatumokBetoltese(elemek);
        });
        elemek.datum.addEventListener('change', () => {
            idopontokBetoltese(elemek);
            osszefoglaloFrissitese(elemek);
        });
        elemek.ido.addEventListener('change', () => osszefoglaloFrissitese(elemek));
        elemek.kuponGomb?.addEventListener('click', () => {
            kuponEllenorzese(elemek).catch(error => {
                console.warn('Kupon ellen\u0151rz\u00e9si hiba:', error);
                kuponStatusz(elemek, supabaseHiba(error), true);
            });
        });
        elemek.kuponInput?.addEventListener('input', () => {
            allapot.kuponEllenorzesAzonosito += 1;
            allapot.aktivKupon = null;
            kuponStatusz(elemek, '');
            osszefoglaloFrissitese(elemek);
        });

        szolgaltatasokBetoltese(elemek);
        kuponokBetoltese(elemek);
    });
