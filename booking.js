(function () {
    'use strict';

    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const MEDIA_BUCKET = 'site-media';
    const INSPIRATION_FOLDER = 'booking-inspirations';
    const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
    const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

    if (!document.body || document.body.dataset.bookingMode !== 'supabase') {
        return;
    }

    const allapot = {
        kliens: null,
        szolgaltatasok: [],
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

        allapot.kliens = supabaseLib.createClient(config.url, config.publishableKey);

        elemek.urlap.addEventListener('submit', event => {
            event.preventDefault();
            foglalasKuldes(elemek);
        });

        elemek.szolgaltatas.addEventListener('change', () => szabadDatumokBetoltese(elemek));
        elemek.datum.addEventListener('change', () => {
            idopontokBetoltese(elemek);
            osszefoglaloFrissitese(elemek);
        });
        elemek.ido.addEventListener('change', () => osszefoglaloFrissitese(elemek));

        szolgaltatasokBetoltese(elemek);
    });

    function urlapElemek() {
        return {
            urlap: document.getElementById('foglalas-urlap'),
            nev: document.getElementById('foglalas-nev'),
            telefon: document.getElementById('foglalas-tel'),
            email: document.getElementById('foglalas-email'),
            szolgaltatas: document.getElementById('foglalas-szolgatatas'),
            datum: document.getElementById('foglalas-datum'),
            ido: document.getElementById('foglalas-ido'),
            komment: document.getElementById('foglalas-komment'),
            kuldes: document.getElementById('foglalas-kuldes'),
            statusz: document.getElementById('foglalas-status'),
            szolgaltatasKartyak: document.getElementById('foglalas-szolgaltatas-kartyak'),
            datumKartyak: document.getElementById('foglalas-datum-kartyak'),
            idoKartyak: document.getElementById('foglalas-ido-kartyak'),
            stilusTipp: document.getElementById('foglalas-stilus-tipp'),
            kepInput: document.getElementById('foglalas-inspiracio-kep'),
            kepEloNezet: document.getElementById('foglalas-kep-elonezet'),
            osszefoglalo: document.getElementById('foglalas-osszefoglalo')
        };
    }

    function feluletBekotese(elemek) {
        document.querySelector('[data-booking-path="online"]')?.addEventListener('click', event => {
            const cel = document.getElementById('online-foglalas');
            if (cel) {
                event.preventDefault();
                kovetkezoReszhezGordit(cel, 0);
            }
        });

        document.querySelectorAll('input[name="korom-stilus"]').forEach(input => {
            input.addEventListener('change', () => {
                stilusAllapotFrissitese(elemek);
                osszefoglaloFrissitese(elemek);
                kovetkezoReszhezGordit('[data-step="3"]');
            });
        });

        [elemek.nev, elemek.telefon, elemek.email, elemek.komment].filter(Boolean).forEach(mezo => {
            mezo.addEventListener('input', () => osszefoglaloFrissitese(elemek));
        });

        elemek.kepInput?.addEventListener('change', () => {
            kepEloNezetFrissitese(elemek);
            osszefoglaloFrissitese(elemek);
            if (elemek.kepInput.files?.length) kovetkezoReszhezGordit('[data-step="5"]', 260);
        });

        elemek.kepEloNezet?.addEventListener('click', event => {
            if (event.target.closest('#foglalas-kep-torles')) {
                kepValasztasTorlese(elemek);
                osszefoglaloFrissitese(elemek);
            }
        });
    }

    function kapcsolatLinkekFrissitese() {
        const kapcsolat = window.lumiAdatok?.kapcsolat || {};
        const instagram = document.querySelector('[data-booking-contact="instagram"]');
        const messenger = document.querySelector('[data-booking-contact="messenger"]');
        const sms = document.querySelector('[data-booking-contact="sms"]');
        const alapMessenger = 'https://m.me/petras.szofi';
        const alapSms = 'sms:+36205636494';

        if (instagram && kapcsolat.instagramUzenet) {
            instagram.href = kapcsolat.instagramUzenet;
        }

        if (messenger) {
            messenger.href = kapcsolat.messenger && !kapcsolat.messenger.includes('61576508698202')
                ? kapcsolat.messenger
                : alapMessenger;
        }

        if (sms) {
            sms.href = kapcsolat.smsUzenet || alapSms;
        }
    }

    async function szolgaltatasokBetoltese(elemek) {
        selectAllapot(elemek.szolgaltatas, 'Szolgáltatások betöltése...');
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
        kartyaUzenet(elemek.szolgaltatasKartyak, 'Szolgáltatások betöltése...');
        kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
        statuszKiirasa(elemek.statusz, '');

        const { data, error } = await allapot.kliens
            .from('services')
            .select('id,name,description,price_text,duration_minutes')
            .eq('active', true)
            .eq('booking_enabled', true)
            .order('sort_order', { ascending: true });

        if (error) {
            statuszKiirasa(elemek.statusz, 'A szolgáltatások még nem tölthetők be. Futtasd a Supabase SQL fájlt, majd próbáld újra.', true);
            selectAllapot(elemek.szolgaltatas, 'A szolgáltatások nem érhetők el');
            kartyaUzenet(elemek.szolgaltatasKartyak, 'A szolgáltatások most nem érhetők el.');
            return;
        }

        allapot.szolgaltatasok = Array.isArray(data) ? data : [];
        elemek.szolgaltatas.innerHTML = '<option value="" disabled selected>Válassz szolgáltatást...</option>';

        allapot.szolgaltatasok.forEach(szolgaltatas => {
            const option = document.createElement('option');
            option.value = szolgaltatas.id;
            option.textContent = szolgaltatasFelirat(szolgaltatas);
            elemek.szolgaltatas.appendChild(option);
        });

        if (allapot.szolgaltatasok.length === 0) {
            selectAllapot(elemek.szolgaltatas, 'Nincs aktív foglalható szolgáltatás');
            kartyaUzenet(elemek.szolgaltatasKartyak, 'Nincs aktív foglalható szolgáltatás.');
            return;
        }

        szolgaltatasKartyakRenderelese(elemek);
    }

    function szolgaltatasKartyakRenderelese(elemek) {
        if (!elemek.szolgaltatasKartyak) return;
        elemek.szolgaltatasKartyak.innerHTML = '';

        allapot.szolgaltatasok.forEach(szolgaltatas => {
            const kartya = document.createElement('button');
            kartya.type = 'button';
            kartya.className = 'foglalas-valaszto-kartya';
            kartya.dataset.value = szolgaltatas.id;
            kartya.innerHTML = `
                <span class="foglalas-kartya-cim">${html(szolgaltatas.description?.trim() || szolgaltatas.name)}</span>
                <span class="foglalas-kartya-meta">${html([szolgaltatas.price_text, idoFelirat(szolgaltatas.duration_minutes)].filter(Boolean).join(' • '))}</span>
            `;
            kartya.addEventListener('click', () => {
                elemek.szolgaltatas.value = szolgaltatas.id;
                kartyaAktivAllapot(elemek.szolgaltatasKartyak, szolgaltatas.id);
                szabadDatumokBetoltese(elemek);
                osszefoglaloFrissitese(elemek);
                kovetkezoReszhezGordit('[data-step="2"]');
            });
            elemek.szolgaltatasKartyak.appendChild(kartya);
        });
    }

    async function szabadDatumokBetoltese(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;

        selectAllapot(elemek.ido, 'Előbb válassz dátumot...');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');

        if (!szolgaltatasId) {
            selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
            kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
            return;
        }

        selectAllapot(elemek.datum, 'Szabad dátumok betöltése...');
        kartyaUzenet(elemek.datumKartyak, 'Szabad dátumok betöltése...');
        statuszKiirasa(elemek.statusz, '');

        const { data, error } = await allapot.kliens.rpc('get_available_dates', {
            p_service_id: szolgaltatasId,
            p_start_date: maiDatum(),
            p_days: 90
        });

        if (error) {
            statuszKiirasa(elemek.statusz, 'Most nem sikerült lekérni a szabad dátumokat. Futtasd a legfrissebb Supabase SQL-t, majd próbáld újra.', true);
            selectAllapot(elemek.datum, 'A szabad dátumok nem érhetők el');
            kartyaUzenet(elemek.datumKartyak, 'A szabad dátumok most nem érhetők el.');
            return;
        }

        const datumok = Array.isArray(data) ? data : [];
        elemek.datum.innerHTML = '<option value="" disabled selected>Válassz szabad dátumot...</option>';

        datumok.forEach(datum => {
            const option = document.createElement('option');
            option.value = datum.work_date;
            option.textContent = datumFelirat(datum.work_date);
            elemek.datum.appendChild(option);
        });

        if (datumok.length === 0) {
            selectAllapot(elemek.datum, 'Nincs szabad dátum ehhez a szolgáltatáshoz');
            kartyaUzenet(elemek.datumKartyak, 'Nincs szabad dátum ehhez a szolgáltatáshoz.');
            return;
        }

        valasztoKartyakRenderelese(elemek.datum, elemek.datumKartyak, 'datum', value => {
            elemek.datum.value = value;
            kartyaAktivAllapot(elemek.datumKartyak, value);
            idopontokBetoltese(elemek);
            osszefoglaloFrissitese(elemek);
        });
    }

    async function idopontokBetoltese(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;
        const datum = elemek.datum.value;

        if (!szolgaltatasId || !datum) {
            selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
            kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
            return;
        }

        if (datum < maiDatum()) {
            selectAllapot(elemek.ido, 'Múltbeli dátum nem választható');
            kartyaUzenet(elemek.idoKartyak, 'Múltbeli dátum nem választható.');
            return;
        }

        selectAllapot(elemek.ido, 'Szabad időpontok betöltése...');
        kartyaUzenet(elemek.idoKartyak, 'Szabad időpontok betöltése...');
        statuszKiirasa(elemek.statusz, '');

        const { data, error } = await allapot.kliens.rpc('get_available_slots', {
            p_service_id: szolgaltatasId,
            p_date: datum
        });

        if (error) {
            statuszKiirasa(elemek.statusz, 'Most nem sikerült lekérni a szabad időpontokat. Kérlek próbáld újra kicsit később.', true);
            selectAllapot(elemek.ido, 'Nem sikerült betölteni');
            kartyaUzenet(elemek.idoKartyak, 'Nem sikerült betölteni az időpontokat.');
            return;
        }

        const idopontok = Array.isArray(data) ? data : [];
        elemek.ido.innerHTML = '<option value="" disabled selected>Válassz időpontot...</option>';

        idopontok.forEach(idopont => {
            const option = document.createElement('option');
            option.value = idopont.starts_at;
            option.textContent = idopont.label;
            elemek.ido.appendChild(option);
        });

        if (idopontok.length === 0) {
            selectAllapot(elemek.ido, 'Erre a napra nincs szabad időpont');
            kartyaUzenet(elemek.idoKartyak, 'Erre a napra nincs szabad időpont.');
            return;
        }

        valasztoKartyakRenderelese(elemek.ido, elemek.idoKartyak, 'ido', value => {
            elemek.ido.value = value;
            kartyaAktivAllapot(elemek.idoKartyak, value);
            osszefoglaloFrissitese(elemek);
            kovetkezoReszhezGordit('[data-step="4"]');
        });
    }

    function valasztoKartyakRenderelese(select, container, tipus, onSelect) {
        if (!container || !select) return;
        container.innerHTML = '';
        container.classList.toggle('foglalas-datum-csik', tipus === 'datum');
        container.classList.toggle('foglalas-mini-racs', tipus !== 'datum' && tipus !== 'ido');
        container.classList.toggle('foglalas-ido-racs', tipus === 'ido');

        const options = Array.from(select.options).filter(option => option.value);

        options.forEach(option => {
            const kartya = document.createElement('button');
            kartya.type = 'button';
            kartya.dataset.value = option.value;

            if (tipus === 'datum') {
                kartya.className = 'foglalas-datum-chip';
                kartya.innerHTML = datumChipHtml(option.value);
            } else {
                kartya.className = tipus === 'ido' ? 'foglalas-idopont-gomb' : 'foglalas-mini-kartya';
                kartya.textContent = option.textContent;
            }

            kartya.addEventListener('click', () => onSelect(option.value));
            container.appendChild(kartya);
        });
    }

    function datumChipHtml(datumSzoveg) {
        const [ev, honap, nap] = datumSzoveg.split('-').map(Number);
        const datum = new Date(ev, honap - 1, nap, 12, 0, 0);
        const honapNev = new Intl.DateTimeFormat('hu-HU', { month: 'short' }).format(datum).replace('.', '');
        const hetnap = new Intl.DateTimeFormat('hu-HU', { weekday: 'long' }).format(datum);

        return `<span class="foglalas-datum-chip-nap">${String(nap).padStart(2, '0')}</span><span class="foglalas-datum-chip-resz">${html(honapNev)} · ${html(hetnap)}</span>`;
    }
    async function foglalasKuldes(elemek) {
        const adatok = foglalasAdatok(elemek);
        const hiba = foglalasHiba(adatok);

        if (hiba) {
            statuszKiirasa(elemek.statusz, hiba, true);
            return;
        }

        let inspiraciok = [];

        if (adatok.kepFiles.length) {
            gombAllapot(elemek.kuldes, true, 'Inspirációs képek feltöltése...');
            statuszKiirasa(elemek.statusz, 'Képek feltöltése folyamatban...');
            const feltoltes = await inspiraciosKepekFeltoltese(adatok.kepFiles, elemek.statusz);

            if (!feltoltes.ok) {
                statuszKiirasa(elemek.statusz, feltoltes.uzenet || 'A képek feltöltése nem sikerült. Töröld a képeket vagy próbáld újra.', true);
                gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
                return;
            }

            inspiraciok = feltoltes.kepek;
        }
        gombAllapot(elemek.kuldes, true, 'Foglalás és visszaigazolás küldése...');
        statuszKiirasa(elemek.statusz, '');

        const eredmeny = await foglalasMenteseEmaillel(adatok);

        if (!eredmeny.ok) {
            statuszKiirasa(elemek.statusz, supabaseHiba(eredmeny.error), true);
            gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
            idopontokBetoltese(elemek);
            return;
        }

        let extraMentve = true;
        if (eredmeny.booking_id && inspiraciok.length) {
            const extra = await foglalasInspiracioMentese(eredmeny.booking_id, adatok, inspiraciok);
            extraMentve = extra.ok;
        }

        const emailEredmeny = eredmeny.email || { ok: false, error: 'missing_email_result' };
        naptarLinkFrissitese(adatok);
        sikeresPopupNyitasa(emailEredmeny);
        elemek.urlap.reset();
        kepValasztasTorlese(elemek);
        stilusAllapotFrissitese(elemek);
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
        kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
        kartyaAktivAllapot(elemek.szolgaltatasKartyak, '');
        osszefoglaloFrissitese(elemek);
        statuszKiirasa(elemek.statusz, emailEredmeny.ok
            ? `A foglalás elküldve. A visszaigazoló emailt is elküldtük.${extraMentve ? '' : ' A képek adminhoz csatolását ellenőrizni kell.'}`
            : `A foglalás elküldve. Az email értesítés most nem biztos, hogy elment, de a foglalás bekerült.${extraMentve ? '' : ' A képek adminhoz csatolását ellenőrizni kell.'}`);
        gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
    }

    async function foglalasMenteseEmaillel(adatok) {
        if (allapot.kliens.functions?.invoke) {
            try {
                const { data, error } = await allapot.kliens.functions.invoke('create-booking-with-email', {
                    body: {
                        service_id: adatok.szolgaltatasId,
                        customer_name: adatok.nev,
                        customer_phone: adatok.telefon,
                        customer_email: adatok.email,
                        note: adatok.megjegyzes,
                        starts_at: adatok.startsAt
                    }
                });

                if (!error && data?.ok && data?.booking_id) {
                    console.info('Lumi Nails booking function result:', data);
                    return data;
                }

                console.warn('Lumi Nails foglalás function nem futott végig, tartalék mentés indul:', error || data);
            } catch (error) {
                console.warn('Lumi Nails foglalás function hiba, tartalék mentés indul:', error);
            }
        }

        return foglalasMenteseKozvetlenul(adatok);
    }

    async function foglalasMenteseKozvetlenul(adatok) {
        const { data, error } = await allapot.kliens.rpc('create_booking', {
            p_service_id: adatok.szolgaltatasId,
            p_customer_name: adatok.nev,
            p_customer_phone: adatok.telefon,
            p_customer_email: adatok.email,
            p_note: adatok.megjegyzes,
            p_starts_at: adatok.startsAt
        });

        if (error) {
            return { ok: false, error };
        }

        console.info('Lumi Nails booking saved with fallback RPC:', data);

        return {
            ok: true,
            booking_id: data,
            fallback: true,
            email: {
                ok: false,
                skipped: true,
                fallback: true,
                reason: 'A foglalás tartalék módban került mentésre, ezért az automatikus email nem indult el.'
            }
        };
    }

    async function inspiraciosKepekFeltoltese(files, statuszElem) {
        const kepek = [];

        for (let index = 0; index < files.length; index += 1) {
            statuszKiirasa(statuszElem, `Képek feltöltése: ${index + 1}/${files.length}`);
            const feltoltes = await inspiraciosKepFeltoltese(files[index]);

            if (!feltoltes.ok) {
                return feltoltes;
            }

            kepek.push(feltoltes.adat);
        }

        return { ok: true, kepek };
    }
    async function inspiraciosKepFeltoltese(file) {
        const hiba = kepFajlHiba(file);
        if (hiba) return { ok: false, uzenet: hiba };

        try {
            const ext = kepKiterjesztes(file);
            const azonosito = randomAzonosito();
            const path = `${INSPIRATION_FOLDER}/${maiDatum()}/${Date.now()}-${azonosito}.${ext}`;
            const { error } = await allapot.kliens.storage
                .from(MEDIA_BUCKET)
                .upload(path, file, {
                    cacheControl: '31536000',
                    upsert: false,
                    contentType: file.type || `image/${ext}`
                });

            if (error) {
                console.error('Inspirációs kép feltöltési hiba:', error);
                return { ok: false, uzenet: 'A kép feltöltése nem sikerült. Lehet, hogy még nem futott le a foglalási kép SQL.' };
            }

            const { data } = allapot.kliens.storage.from(MEDIA_BUCKET).getPublicUrl(path);
            return {
                ok: true,
                adat: {
                    url: data?.publicUrl || '',
                    path,
                    name: file.name,
                    type: file.type || '',
                    size: file.size
                }
            };
        } catch (error) {
            console.error('Inspirációs kép feltöltési kivétel:', error);
            return { ok: false, uzenet: 'A kép feltöltése nem sikerült. Kérlek próbáld újra.' };
        }
    }

    async function foglalasInspiracioMentese(bookingId, adatok, inspiraciok) {
        try {
            const { error } = await allapot.kliens.rpc('attach_booking_inspiration', {
                p_booking_id: bookingId,
                p_images: inspiraciok,
                p_nail_style: adatok.koromStilus,
                p_nail_style_note: adatok.eredetiMegjegyzes
            });

            if (error) {
                console.warn('Inspirációs képek csatolása nem sikerült:', error);
                return { ok: false, error };
            }

            return { ok: true };
        } catch (error) {
            console.warn('Inspirációs képek csatolási kivétel:', error);
            return { ok: false, error };
        }
    }
    function foglalasAdatok(elemek) {
        const koromStilus = document.querySelector('input[name="korom-stilus"]:checked')?.value || '';
        const eredetiMegjegyzes = elemek.komment.value.trim();
        const megjegyzes = foglalasMegjegyzes(koromStilus, eredetiMegjegyzes);

        return {
            nev: elemek.nev.value.trim(),
            telefon: `+36 ${elemzesTelefon(elemek.telefon.value)}`,
            telefonSzamok: elemzesTelefon(elemek.telefon.value),
            email: elemek.email.value.trim().toLowerCase(),
            szolgaltatasId: elemek.szolgaltatas.value,
            szolgaltatas: allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === elemek.szolgaltatas.value),
            datum: elemek.datum.value,
            startsAt: elemek.ido.value,
            koromStilus,
            eredetiMegjegyzes,
            megjegyzes,
            kepFiles: Array.from(elemek.kepInput?.files || [])
        };
    }

    function foglalasMegjegyzes(koromStilus, megjegyzes) {
        const sorok = [];
        if (koromStilus) sorok.push(`Köröm stílus: ${koromStilus}`);
        if (megjegyzes) sorok.push(`Elképzelés / megjegyzés: ${megjegyzes}`);
        return sorok.join('\n');
    }

    function foglalasHiba(adatok) {
        if (!adatok.nev || !adatok.telefonSzamok || !adatok.email || !adatok.szolgaltatasId || !adatok.datum || !adatok.startsAt) {
            return 'Kérlek válassz szolgáltatást, dátumot, időpontot, és add meg az elérhetőségeidet.';
        }

        if (!adatok.koromStilus) {
            return 'Kérlek jelöld, hogy egyszerű, francia vagy festett/díszített körmöt szeretnél.';
        }

        if (adatok.telefonSzamok.length !== 9) {
            return 'Kérlek 9 számjegyű magyar mobilszámot adj meg, országkód nélkül. Példa: 301234567';
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adatok.email)) {
            return 'Kérlek valós email címet adj meg.';
        }

        if (adatok.datum < maiDatum()) {
            return 'Múltbeli dátumra nem lehet időpontot foglalni.';
        }

        if (adatok.kepFiles.length > MAX_IMAGE_COUNT) {
            return `Legfeljebb ${MAX_IMAGE_COUNT} inspirációs képet tölthetsz fel.`;
        }

        for (const file of adatok.kepFiles) {
            const kepHiba = kepFajlHiba(file);
            if (kepHiba) return kepHiba;
        }

        return '';
    }

    function kepFajlHiba(file) {
        if (!file) return '';

        if (file.size > MAX_IMAGE_SIZE) {
            return 'A feltöltött kép legfeljebb 12 MB lehet.';
        }

        const type = String(file.type || '').toLowerCase();
        const name = String(file.name || '').toLowerCase();
        const extensionOk = /\.(jpe?g|png|webp|avif|heic|heif)$/.test(name);

        if (type && !SUPPORTED_IMAGE_TYPES.includes(type) && !extensionOk) {
            return 'Kérlek JPG, PNG, WebP, AVIF vagy HEIC képet tölts fel.';
        }

        if (!type && !extensionOk) {
            return 'Kérlek képfájlt tölts fel.';
        }

        return '';
    }

    function kepEloNezetFrissitese(elemek) {
        const files = Array.from(elemek.kepInput?.files || []);

        if (files.length > MAX_IMAGE_COUNT) {
            statuszKiirasa(elemek.statusz, `Legfeljebb ${MAX_IMAGE_COUNT} inspirációs képet tölthetsz fel.`, true);
            kepValasztasTorlese(elemek);
            return;
        }

        for (const file of files) {
            const hiba = kepFajlHiba(file);
            if (hiba) {
                statuszKiirasa(elemek.statusz, hiba, true);
                kepValasztasTorlese(elemek);
                return;
            }
        }

        statuszKiirasa(elemek.statusz, '');
        allapot.kepPreviewUrls.forEach(url => URL.revokeObjectURL(url));
        allapot.kepPreviewUrls = [];

        if (!files.length || !elemek.kepEloNezet) {
            kepValasztasTorlese(elemek);
            return;
        }

        const kepekHtml = files.map(file => {
            const url = URL.createObjectURL(file);
            allapot.kepPreviewUrls.push(url);
            return `
                <figure class="foglalas-kep-mini">
                    <img src="${url}" alt="Inspirációs kép előnézet">
                    <figcaption>${html(file.name)}<br><small>${Math.round(file.size / 1024)} KB</small></figcaption>
                </figure>
            `;
        }).join('');

        elemek.kepEloNezet.innerHTML = `
            <div class="foglalas-kep-elonezet-racs">${kepekHtml}</div>
            <button type="button" id="foglalas-kep-torles" class="bezaro-link">Képek eltávolítása</button>
        `;
        elemek.kepEloNezet.hidden = false;
    }

    function kepValasztasTorlese(elemek) {
        allapot.kepPreviewUrls.forEach(url => URL.revokeObjectURL(url));
        allapot.kepPreviewUrls = [];
        if (elemek.kepInput) elemek.kepInput.value = '';
        if (elemek.kepEloNezet) {
            elemek.kepEloNezet.innerHTML = '';
            elemek.kepEloNezet.hidden = true;
        }
    }
    function stilusAllapotFrissitese(elemek) {
        const valasztott = document.querySelector('input[name="korom-stilus"]:checked')?.value || '';
        document.querySelectorAll('.foglalas-stilus-kartya').forEach(kartya => {
            const input = kartya.querySelector('input');
            kartya.classList.toggle('aktiv', Boolean(input?.checked));
        });

        if (elemek.stilusTipp) {
            elemek.stilusTipp.hidden = !valasztott || valasztott.includes('Egyszerű');
        }
    }

    function osszefoglaloFrissitese(elemek) {
        if (!elemek.osszefoglalo) return;

        const szolgaltatas = selectedText(elemek.szolgaltatas);
        const stilus = document.querySelector('input[name="korom-stilus"]:checked')?.value || '';
        const datum = selectedText(elemek.datum);
        const ido = selectedText(elemek.ido);
        const files = Array.from(elemek.kepInput?.files || []);
        const megjegyzes = elemek.komment?.value.trim() || '';
        const nev = elemek.nev?.value.trim() || '';
        const telefon = elemzesTelefon(elemek.telefon?.value || '');
        const email = elemek.email?.value.trim() || '';

        const sorok = [
            ['Szolgáltatás', szolgaltatas],
            ['Stílus', stilus],
            ['Időpont', [datum, ido].filter(Boolean).join(' • ')],
            ['Inspiráció', files.length ? `${files.length} kép kiválasztva` : 'Nincs kép kiválasztva'],
            ['Megjegyzés', megjegyzes],
            ['Elérhetőség', [nev, telefon ? `+36 ${telefon}` : '', email].filter(Boolean).join(' • ')]
        ].filter(([, ertek]) => ertek);

        if (!sorok.length) {
            elemek.osszefoglalo.innerHTML = '<h3>Foglalás összefoglaló</h3><p>Válaszd ki a szolgáltatást, stílust, dátumot és időpontot, és itt látod majd egyben a foglalásodat.</p>';
            return;
        }

        elemek.osszefoglalo.innerHTML = `
            <h3>Foglalás összefoglaló</h3>
            <dl>${sorok.map(([cim, ertek]) => `<div><dt>${html(cim)}</dt><dd>${html(ertek)}</dd></div>`).join('')}</dl>
        `;
    }

    function selectedText(select) {
        const option = select?.selectedOptions?.[0];
        if (!option || !option.value) return '';
        return option.textContent.trim();
    }

    function kovetkezoReszhezGordit(cel, kesleltetes = 120) {
        const elem = typeof cel === 'string' ? document.querySelector(cel) : cel;
        if (!elem) return;

        window.setTimeout(() => {
            const fejlec = document.querySelector('header');
            const fejlecAlja = fejlec ? Math.ceil(fejlec.getBoundingClientRect().bottom) : 0;
            const res = window.matchMedia('(max-width: 760px)').matches ? 18 : 24;
            const aktualisPozicio = window.scrollY || document.documentElement.scrollTop || 0;
            const celPozicio = elem.getBoundingClientRect().top + aktualisPozicio - fejlecAlja - res;

            window.scrollTo({
                top: Math.max(0, celPozicio),
                behavior: 'smooth'
            });
        }, kesleltetes);
    }
    function selectAllapot(select, szoveg) {
        if (!select) return;
        select.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.selected = true;
        option.textContent = szoveg;
        select.appendChild(option);
    }

    function kartyaUzenet(container, szoveg) {
        if (!container) return;
        if (container.id === 'foglalas-datum-kartyak') {
            container.classList.remove('foglalas-datum-csik');
            container.classList.add('foglalas-mini-racs');
        }
        container.innerHTML = `<p class="foglalas-kartya-uzenet">${html(szoveg)}</p>`;
    }

    function kartyaAktivAllapot(container, value) {
        if (!container) return;
        container.querySelectorAll('[data-value]').forEach(kartya => {
            kartya.classList.toggle('aktiv', Boolean(value) && kartya.dataset.value === value);
        });
    }

    function datumFelirat(datumSzoveg) {
        const [ev, honap, nap] = datumSzoveg.split('-').map(Number);
        return new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'long'
        }).format(new Date(ev, honap - 1, nap, 12, 0, 0));
    }

    function statuszKiirasa(elem, szoveg, hiba = false) {
        if (!elem) return;
        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }

    function mezokTiltasa(elemek, tiltva) {
        elemek.urlap?.querySelectorAll('input, select, textarea, button').forEach(elem => {
            elem.disabled = tiltva;
        });
    }

    function gombAllapot(gomb, tiltva, szoveg) {
        if (!gomb) return;
        gomb.disabled = tiltva;
        gomb.textContent = szoveg;
    }

    function sikeresPopupNyitasa(emailEredmeny = { ok: false }) {
        const popup = document.getElementById('sikeres-popup');
        const popupCim = popup?.querySelector('.popup-cim');
        const popupSzoveg = popup?.querySelector('.popup-szoveg');
        const popupAdatok = window.lumiAdatok?.foglalas?.popup || {};
        const emailSikerult = Boolean(emailEredmeny.ok);

        if (popupCim) {
            popupCim.textContent = emailSikerult
                ? (popupAdatok.emailSikeresCim || 'Foglalás elküldve')
                : (popupAdatok.emailHibaCim || 'Foglalás rögzítve');
        }

        if (popupSzoveg) {
            popupSzoveg.textContent = emailSikerult
                ? (popupAdatok.emailSikeresSzoveg || 'Köszönöm, megkaptam a foglalásodat. A visszaigazoló emailt is elküldtük.')
                : (popupAdatok.emailHibaSzoveg || 'A foglalásod bekerült a rendszerbe, de a visszaigazoló email most nem biztos, hogy elment.');
        }

        if (popup) popup.style.display = 'flex';
    }

    function naptarLinkFrissitese(adatok) {
        const link = document.getElementById('naptar-link');

        if (!link || !adatok.startsAt || !adatok.szolgaltatas) return;

        const kezdes = new Date(adatok.startsAt);
        const idotartamPerc = adatok.szolgaltatas.duration_minutes > 0 ? adatok.szolgaltatas.duration_minutes : 30;
        const vege = new Date(kezdes.getTime() + idotartamPerc * 60000);
        const cim = `Lumi Nails - ${adatok.szolgaltatas.name}`;
        const leiras = `Foglalás: ${adatok.szolgaltatas.name}\nKöröm stílus: ${adatok.koromStilus}\nNév: ${adatok.nev}\nTelefon: ${adatok.telefon}`;
        const helyszin = '2800 Tatabánya, Kós Károly út';
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Lumi Nails//Booking//HU',
            'BEGIN:VEVENT',
            `UID:${Date.now()}@luminails.hu`,
            `DTSTAMP:${icsDatum(new Date())}`,
            `DTSTART:${icsDatum(kezdes)}`,
            `DTEND:${icsDatum(vege)}`,
            `SUMMARY:${icsSzoveg(cim)}`,
            `DESCRIPTION:${icsSzoveg(leiras)}`,
            `LOCATION:${icsSzoveg(helyszin)}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });

        if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);

        const url = URL.createObjectURL(blob);
        link.href = url;
        link.dataset.url = url;
        link.download = 'lumi-nails-foglalas.ics';
        link.hidden = false;
    }

    function szolgaltatasFelirat(szolgaltatas) {
        const reszek = [szolgaltatas.description?.trim() || szolgaltatas.name];
        if (szolgaltatas.price_text) reszek.push(szolgaltatas.price_text);
        if (szolgaltatas.duration_minutes > 0) reszek.push(idoFelirat(szolgaltatas.duration_minutes));
        return reszek.join(' - ');
    }

    function idoFelirat(percOsszesen) {
        const ora = Math.floor((percOsszesen || 0) / 60);
        const perc = (percOsszesen || 0) % 60;
        const reszek = [];
        if (ora > 0) reszek.push(`${ora} óra`);
        if (perc > 0) reszek.push(`${perc} perc`);
        return reszek.join(' ') || '';
    }

    function elemzesTelefon(ertek) {
        let szamok = String(ertek || '').replace(/\D/g, '');
        if (szamok.startsWith('36')) {
            szamok = szamok.substring(2);
        } else if (szamok.startsWith('06')) {
            szamok = szamok.substring(2);
        }
        while (szamok.startsWith('0')) szamok = szamok.substring(1);
        return szamok.substring(0, 9);
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