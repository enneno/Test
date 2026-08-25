// Generated from src/booking by npm run build. Edit the source parts, not this file.

(function () {
    'use strict';

    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
    const MAX_IMAGE_COUNT = 5;
    const IMAGE_UPLOAD_MAX_SIDE = 1600;
    const IMAGE_UPLOAD_MAX_BYTES = 480 * 1024;
    const IMAGE_UPLOAD_WEBP_QUALITY = 0.82;
    const LUMI_FOGLALASI_TARTALOM_KESZ_ESEMENY = 'lumi:foglalasi-tartalom-kesz';
    const LUMI_TARTALOM_KESZ_ESEMENY = 'lumi:tartalom-kesz';
    const IMAGE_UPLOAD_MIN_QUALITY = 0.56;
    const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
    let bookingCanvasOutputFormatPromise = null;

    if (!document.body || document.body.dataset.bookingMode !== 'supabase') {
        return;
    }

    const allapot = {
        kliens: null,
        szolgaltatasok: [],
        kuponok: [],
        aktivKupon: null,
        kuponEllenorzesAzonosito: 0,
        datumKeresAzonosito: 0,
        idoKeresAzonosito: 0,
        foglalasKeresKulcs: '',
        foglalasKeresUjjlenyomat: '',
        kepPreviewUrls: []
    };

    document.addEventListener('DOMContentLoaded', () => {
        const elemek = urlapElemek();

        if (!elemek.urlap) {
            return;
        }

        kapcsolatLinkekFrissitese();
        document.addEventListener(LUMI_TARTALOM_KESZ_ESEMENY, kapcsolatLinkekFrissitese, { once: true });
        feluletBekotese(elemek);
        osszefoglaloFrissitese(elemek);

        if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
            statuszKiirasa(elemek.statusz, 'A foglalási rendszer még nincs összekötve a Supabase projekttel.', true);
            mezokTiltasa(elemek, true);
            foglalasiTartalomKeszJelzese();
            return;
        }

        allapot.kliens = window.lumiSupabaseClient();
        foglalasKezeloBekotese();
        vendegFiokFoglalasElokitese(elemek).catch(error => {
            console.warn('A vendégfiók foglalási előkitöltése nem sikerült:', error);
        });

        elemek.urlap.addEventListener('submit', event => {
            event.preventDefault();
            foglalasKuldes(elemek).catch(error => {
                console.error('Lumi Nails foglalás beküldési hiba:', error);
                statuszKiirasa(elemek.statusz, supabaseHiba(error), true);
                kovetkezoReszhezGordit(elemek.statusz);
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

    async function vendegFiokFoglalasElokitese(elemek) {
        if (!allapot.kliens?.auth || !elemek.nev || !elemek.telefon || !elemek.email) return;

        const { data: accountsReady, error: readinessError } = await allapot.kliens.rpc('customer_accounts_ready');
        if (readinessError || accountsReady !== true) return;

        const { data, error } = await allapot.kliens.auth.getUser();
        const user = error ? null : data?.user;
        if (!user?.email || !user.email_confirmed_at || user.is_anonymous) return;

        const profileResult = await allapot.kliens.rpc('ensure_customer_account');
        if (profileResult.error) {
            console.warn('A hitelesített vendégprofil nem készíthető elő:', profileResult.error.message);
            return;
        }

        const profile = Array.isArray(profileResult.data)
            ? profileResult.data[0]
            : profileResult.data;
        const nationalPhone = vendegNemzetiTelefonszam(profile?.phone);

        elemek.nev.value = profile?.full_name || String(user.user_metadata?.full_name || '');
        if (nationalPhone) elemek.telefon.value = nationalPhone;
        elemek.email.value = String(user.email).trim().toLowerCase();
        elemek.email.readOnly = true;
        elemek.email.setAttribute('aria-readonly', 'true');
        elemek.email.dataset.accountVerified = 'true';
        vendegMentettIgenyekElokitese(elemek, profile);

        vendegFiokJelzesMegjelenitese(elemek);
        osszefoglaloFrissitese(elemek);
    }

    function vendegMentettIgenyekElokitese(elemek, profile) {
        if (!profile) return;

        const urlStilus = new URLSearchParams(window.location.search).get('stilus');
        if (!urlStilus && profile.preferred_nail_style) {
            const styleInput = Array.from(document.querySelectorAll('input[name="korom-stilus"]'))
                .find(input => input.value === profile.preferred_nail_style);
            if (styleInput) {
                styleInput.checked = true;
                stilusAllapotFrissitese(elemek);
            }
        }

        if (!elemek.komment || elemek.komment.value.trim()) return;
        const details = [
            profile.nail_shape ? `forma: ${profile.nail_shape}` : '',
            profile.nail_length ? `hossz: ${profile.nail_length}` : '',
            profile.nail_notes ? String(profile.nail_notes).trim() : ''
        ].filter(Boolean);

        if (details.length) {
            elemek.komment.value = `Mentett körömigények – ${details.join('; ')}`.slice(0, 1000);
        }
    }

    function vendegNemzetiTelefonszam(value) {
        let digits = String(value || '').replace(/\D/g, '');
        if (digits.length === 11 && digits.startsWith('36')) digits = digits.slice(2);
        return digits.length === 9 ? digits : '';
    }

    function vendegFiokJelzesMegjelenitese(elemek) {
        const container = elemek.email.closest('.foglalas-adat-racs');
        if (!container || container.querySelector('.foglalas-fiok-jelzes')) return;

        const message = document.createElement('p');
        message.className = 'foglalas-fiok-jelzes';
        message.append('A fiókodban elmentett adataidat és igényeidet előkészítettük. ');

        const accountLink = document.createElement('a');
        accountLink.href = '/fiokom/';
        accountLink.textContent = 'Adatok módosítása';
        message.appendChild(accountLink);
        container.appendChild(message);
    }

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
            kuponBlokk: document.getElementById('foglalas-kupon-blokk'),
            kuponInput: document.getElementById('foglalas-kupon'),
            kuponGomb: document.getElementById('foglalas-kupon-ellenorzes'),
            kuponStatusz: document.getElementById('foglalas-kupon-status'),
            osszefoglalo: document.getElementById('foglalas-osszefoglalo')
        };
    }

    function feluletBekotese(elemek) {
        document.querySelector('[data-booking-path="online"]')?.addEventListener('click', event => {
            const cel = document.getElementById('online-foglalas');
            if (cel) {
                event.preventDefault();
                kovetkezoReszhezGordit(cel);
            }
        });

        document.querySelectorAll('input[name="korom-stilus"]').forEach(input => {
            input.addEventListener('change', () => {
                stilusAllapotFrissitese(elemek);
                kuponSzolgaltatasValtozott(elemek);
                osszefoglaloFrissitese(elemek);
                if (elemek.szolgaltatas.value) {
                    elemek.datum.value = '';
                    elemek.ido.value = '';
                    szabadDatumokBetoltese(elemek);
                }
                kovetkezoReszhezGordit('[data-step="3"]');
            });
        });

        [elemek.nev, elemek.telefon, elemek.email, elemek.komment].filter(Boolean).forEach(mezo => {
            mezo.addEventListener('input', () => {
                hibakTorlese(elemek);
                osszefoglaloFrissitese(elemek);
            });
        });

        elemek.email?.addEventListener('input', () => {
            if (!ujVendegKupon(allapot.aktivKupon)) return;
            allapot.kuponEllenorzesAzonosito += 1;
            allapot.aktivKupon = null;
            kuponStatusz(elemek, kuponUzenet('ujVendegEmailValtozott', 'Az email c\u00edm m\u00f3dosult, ez\u00e9rt \u00e9rv\u00e9nyes\u00edtsd \u00fajra a kupont.'), true);
            osszefoglaloFrissitese(elemek);
        });

        elemek.kepInput?.addEventListener('change', () => {
            hibakTorlese(elemek);
            kepEloNezetFrissitese(elemek);
            osszefoglaloFrissitese(elemek);
            if (elemek.kepInput.files?.length) kovetkezoReszhezGordit('[data-step="5"]');
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

    function szolgaltatasCsoportKulcs(ertek) {
        return String(ertek || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function szolgaltatasNevBontasa(szolgaltatas) {
        const teljesNev = String(szolgaltatas?.name || '').trim();
        const leiras = String(szolgaltatas?.description || '').trim();
        const nevReszek = teljesNev.split(/\s+-\s+/).filter(Boolean);
        let csoport = '';
        let tetel = leiras || teljesNev;

        if (nevReszek.length > 1) {
            csoport = nevReszek.shift().trim();
            if (!leiras) tetel = nevReszek.join(' - ').trim();
        } else {
            const kulcs = szolgaltatasCsoportKulcs(tetel);
            if (kulcs.startsWith('epites')) csoport = 'Építés';
            else if (kulcs.startsWith('toltes')) csoport = 'Töltés';
            else if (kulcs.includes('manikur')) csoport = 'Manikűr';
            else if (kulcs.includes('gel lakk')) csoport = 'Gél lakk';
            else csoport = 'Szolgáltatások';
        }

        const tetelReszek = tetel.split(/\s+-\s+/).filter(Boolean);
        if (
            tetelReszek.length > 1
            && szolgaltatasCsoportKulcs(tetelReszek[0]) === szolgaltatasCsoportKulcs(csoport)
        ) {
            tetelReszek.shift();
            tetel = tetelReszek.join(' - ').trim();
        }

        return {
            csoport: csoport || 'Szolgáltatások',
            tetel: tetel || teljesNev || 'Szolgáltatás'
        };
    }

    function szolgaltatasCsoportokLetrehozasa(szolgaltatasok) {
        const csoportok = new Map();

        szolgaltatasok.forEach(szolgaltatas => {
            const bontas = szolgaltatasNevBontasa(szolgaltatas);
            const kulcs = szolgaltatasCsoportKulcs(bontas.csoport);
            if (!csoportok.has(kulcs)) {
                csoportok.set(kulcs, { cim: bontas.csoport, tetelek: [] });
            }
            csoportok.get(kulcs).tetelek.push({ szolgaltatas, cim: bontas.tetel });
        });

        return Array.from(csoportok.values());
    }


    async function szolgaltatasokBetoltese(elemek) {
        selectAllapot(elemek.szolgaltatas, 'Szolgáltatások betöltése...');
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
        kartyaUzenet(elemek.szolgaltatasKartyak, 'Szolgáltatások betöltése...');
        kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
        statuszKiirasa(elemek.statusz, '');

        let { data, error } = await allapot.kliens
            .from('services')
            .select('id,name,description,price_text,price_amount,price_unit,price_suffix,duration_minutes')
            .eq('active', true)
            .eq('booking_enabled', true)
            .order('sort_order', { ascending: true });

        if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
            ({ data, error } = await allapot.kliens
                .from('services')
                .select('id,name,description,price_text,duration_minutes')
                .eq('active', true)
                .eq('booking_enabled', true)
                .order('sort_order', { ascending: true }));
        }

        if (error) {
            statuszKiirasa(elemek.statusz, 'A szolgáltatások még nem tölthetők be. Futtasd a Supabase SQL fájlt, majd próbáld újra.', true);
            selectAllapot(elemek.szolgaltatas, 'A szolgáltatások nem érhetők el');
            kartyaUzenet(elemek.szolgaltatasKartyak, 'A szolgáltatások most nem érhetők el.');
            foglalasiTartalomKeszJelzese();
            return;
        }

        allapot.szolgaltatasok = (Array.isArray(data) ? data : []).map(szolgaltatasArNormalizalasa);
        elemek.szolgaltatas.innerHTML = '<option value="" disabled selected>Válassz szolgáltatást...</option>';

        szolgaltatasCsoportokLetrehozasa(allapot.szolgaltatasok).forEach(csoport => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = csoport.cim;
            csoport.tetelek.forEach(({ szolgaltatas }) => {
                const option = document.createElement('option');
                option.value = szolgaltatas.id;
                option.textContent = szolgaltatasFelirat(szolgaltatas);
                optgroup.appendChild(option);
            });
            elemek.szolgaltatas.appendChild(optgroup);
        });

        if (allapot.szolgaltatasok.length === 0) {
            selectAllapot(elemek.szolgaltatas, 'Nincs aktív foglalható szolgáltatás');
            kartyaUzenet(elemek.szolgaltatasKartyak, 'Nincs aktív foglalható szolgáltatás.');
            foglalasiTartalomKeszJelzese();
            return;
        }

        szolgaltatasKartyakRenderelese(elemek);
        await urlbolFoglalasElokitese(elemek);
        foglalasiTartalomKeszJelzese();
    }

    async function urlbolFoglalasElokitese(elemek) {
        const parameters = new URLSearchParams(window.location.search);
        const serviceId = String(parameters.get('szolgaltatas') || '').trim();
        const style = String(parameters.get('stilus') || '').trim();

        if (style) {
            const styleInput = Array.from(document.querySelectorAll('input[name="korom-stilus"]'))
                .find(input => input.value === style);
            if (styleInput) {
                styleInput.checked = true;
                stilusAllapotFrissitese(elemek);
            }
        }

        if (!serviceId || !allapot.szolgaltatasok.some(service => service.id === serviceId)) return;

        elemek.szolgaltatas.value = serviceId;
        kartyaAktivAllapot(elemek.szolgaltatasKartyak, serviceId);
        kuponSzolgaltatasValtozott(elemek);
        await szabadDatumokBetoltese(elemek);
        osszefoglaloFrissitese(elemek);

        const notice = document.createElement('p');
        notice.className = 'foglalas-fiok-jelzes foglalas-ujrafoglalas-jelzes';
        notice.textContent = 'A korábbi szolgáltatást előkészítettük. Ellenőrizd a részleteket, majd válassz új időpontot.';
        const serviceStep = elemek.szolgaltatasKartyak?.closest('.foglalas-lepes');
        if (serviceStep && !serviceStep.querySelector('.foglalas-ujrafoglalas-jelzes')) {
            serviceStep.appendChild(notice);
        }
    }

    function foglalasiTartalomKeszJelzese() {
        document.dispatchEvent(new CustomEvent(LUMI_FOGLALASI_TARTALOM_KESZ_ESEMENY));
    }

    function szolgaltatasKartyakRenderelese(elemek) {
        if (!elemek.szolgaltatasKartyak) return;
        elemek.szolgaltatasKartyak.innerHTML = '';

        szolgaltatasCsoportokLetrehozasa(allapot.szolgaltatasok).forEach((csoport, index) => {
            const szekcio = document.createElement('section');
            const cimAzonosito = `foglalas-szolgaltatas-csoport-${index}`;
            szekcio.className = 'foglalas-szolgaltatas-csoport';
            szekcio.setAttribute('role', 'group');
            szekcio.setAttribute('aria-labelledby', cimAzonosito);

            const cim = document.createElement('h4');
            cim.id = cimAzonosito;
            cim.className = 'foglalas-szolgaltatas-csoport-cim';
            cim.textContent = csoport.cim;

            const racs = document.createElement('div');
            const darab = Math.min(csoport.tetelek.length, 3);
            const rovidCimek = csoport.tetelek.every(tetel => tetel.cim.length <= 12);
            racs.className = `foglalas-szolgaltatas-csoport-racs foglalas-szolgaltatas-csoport-racs-${darab}`;
            racs.classList.toggle('foglalas-szolgaltatas-csoport-racs-rovid', rovidCimek);

            csoport.tetelek.forEach(({ szolgaltatas, cim: tetelCim }) => {
                const ar = szolgaltatas.price_text;
                const idotartam = idoFelirat(szolgaltatas.duration_minutes);
                const meta = [ar, idotartam]
                    .filter(Boolean)
                    .join(' • ');
                const metaHtml = [
                    ar ? '<span class="foglalas-kartya-meta-ar">' + html(ar) + '</span>' : '',
                    ar && idotartam ? '<span class="foglalas-kartya-meta-elvalaszto" aria-hidden="true"> &bull; </span>' : '',
                    idotartam ? '<span class="foglalas-kartya-meta-ido">' + html(idotartam) + '</span>' : ''
                ].join('');
                const kartya = document.createElement('button');
                kartya.type = 'button';
                kartya.className = 'foglalas-valaszto-kartya';
                kartya.dataset.value = szolgaltatas.id;
                kartya.setAttribute('aria-label', [csoport.cim, tetelCim, meta].filter(Boolean).join(', '));
                kartya.innerHTML = `
                    <span class="foglalas-kartya-cim">${html(tetelCim)}</span>
                    <span class="foglalas-kartya-meta">${metaHtml}</span>
                `;
                kartya.addEventListener('click', () => {
                    elemek.szolgaltatas.value = szolgaltatas.id;
                    kuponSzolgaltatasValtozott(elemek);
                    kartyaAktivAllapot(elemek.szolgaltatasKartyak, szolgaltatas.id);
                    szabadDatumokBetoltese(elemek);
                    osszefoglaloFrissitese(elemek);
                    kovetkezoReszhezGordit('[data-step="2"]');
                });
                racs.appendChild(kartya);
            });

            szekcio.append(cim, racs);
            elemek.szolgaltatasKartyak.appendChild(szekcio);
        });
    }

    function valasztottKoromStilusInput() {
        return document.querySelector('input[name="korom-stilus"]:checked');
    }

    function valasztottKoromStilus() {
        return valasztottKoromStilusInput()?.value || '';
    }

    function stilusExtraPerc() {
        const perc = Number.parseInt(valasztottKoromStilusInput()?.dataset.extraMinutes || '0', 10);
        return Number.isFinite(perc) && perc > 0 ? perc : 0;
    }

    async function szabadDatumokBetoltese(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;
        const koromStilus = valasztottKoromStilus();
        const keresAzonosito = ++allapot.datumKeresAzonosito;

        // A datumvaltas minden korabbi idopont-lekerest is ervenytelenit.
        allapot.idoKeresAzonosito += 1;

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

        const { data, error } = await allapot.kliens.rpc('get_available_dates_for_style', {
            p_service_id: szolgaltatasId,
            p_start_date: maiDatum(),
            p_days: 90,
            p_nail_style: koromStilus
        });

        if (
            keresAzonosito !== allapot.datumKeresAzonosito
            || szolgaltatasId !== elemek.szolgaltatas.value
            || koromStilus !== valasztottKoromStilus()
        ) {
            return;
        }

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
        const koromStilus = valasztottKoromStilus();
        const keresAzonosito = ++allapot.idoKeresAzonosito;

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

        const { data, error } = await allapot.kliens.rpc('get_available_slots_for_style', {
            p_service_id: szolgaltatasId,
            p_date: datum,
            p_nail_style: koromStilus
        });

        if (
            keresAzonosito !== allapot.idoKeresAzonosito
            || szolgaltatasId !== elemek.szolgaltatas.value
            || datum !== elemek.datum.value
            || koromStilus !== valasztottKoromStilus()
        ) {
            return;
        }

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
        const hiba = foglalasHiba(adatok, elemek);

        if (hiba) {
            foglalasHibaMutatasa(elemek, hiba);
            return;
        }

        hibakTorlese(elemek);

        let inspiraciok = [];

        if (adatok.kepFiles.length) {
            gombAllapot(elemek.kuldes, true, 'Inspirációs képek előkészítése...');
            statuszKiirasa(elemek.statusz, 'Képek biztonságos előkészítése folyamatban...');
            const feltoltes = await inspiraciosKepekElokeszitese(adatok.kepFiles, elemek.statusz);

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
            kovetkezoReszhezGordit(elemek.statusz);
            gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
            if (!eredmeny.booking_created) idopontokBetoltese(elemek);
            return;
        }

        let extraMentve = true;
        if (eredmeny.booking_id && inspiraciok.length) {
            gombAllapot(elemek.kuldes, true, 'Inspirációs képek biztonságos feltöltése...');
            statuszKiirasa(elemek.statusz, 'A foglalás elkészült, a képeket biztonságosan feltöltjük...');
            const extra = await inspiraciosKepekFeltoltese(
                eredmeny.booking_id,
                eredmeny.request_key,
                adatok,
                inspiraciok
            );
            extraMentve = extra.ok;
        }

        const emailEredmeny = eredmeny.email || { ok: false, error: 'missing_email_result' };
        naptarLinkFrissitese(adatok);
        sikeresPopupNyitasa(emailEredmeny, eredmeny.booking_reference);
        elemek.urlap.reset();
        kepValasztasTorlese(elemek);
        stilusAllapotFrissitese(elemek);
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
        kartyaUzenet(elemek.datumKartyak, 'Előbb válassz szolgáltatást.');
        kartyaUzenet(elemek.idoKartyak, 'Előbb válassz dátumot.');
        kartyaAktivAllapot(elemek.szolgaltatasKartyak, '');
        osszefoglaloFrissitese(elemek);
        foglalasKeresKulcsTorlese();
        statuszKiirasa(elemek.statusz, emailEredmeny.ok
            ? `A foglalás elküldve. A visszaigazoló emailt is elküldtük.${extraMentve ? '' : ' A képek adminhoz csatolását ellenőrizni kell.'}`
            : `A foglalás elküldve. Az email értesítés most nem biztos, hogy elment, de a foglalás bekerült.${extraMentve ? '' : ' A képek adminhoz csatolását ellenőrizni kell.'}`);
        gombAllapot(elemek.kuldes, false, 'Foglalás elküldése');
    }

    async function foglalasMenteseEmaillel(adatok) {
        if (!allapot.kliens.functions?.invoke) {
            return { ok: false, error: new Error('A biztonságos foglalási szolgáltatás nem érhető el.') };
        }

        const requestKey = foglalasKeresKulcsa(adatok);

        try {
            const { data, error } = await allapot.kliens.functions.invoke('create-booking-with-email', {
                body: {
                    request_key: requestKey,
                    service_id: adatok.szolgaltatasId,
                    customer_name: adatok.nev,
                    customer_phone: adatok.telefon,
                    customer_email: adatok.email,
                    note: adatok.megjegyzes,
                    starts_at: adatok.startsAt,
                    coupon_id: adatok.kupon?.id || null,
                    coupon_code: adatok.kupon?.code || null
                }
            });

            if (!error && data?.ok && data?.booking_id) {
                console.info('Lumi Nails booking function result:', data);
                return { ...data, request_key: data.request_key || requestKey };
            }

            return {
                ...(data || {}),
                ok: false,
                error: error || new Error(data?.error || 'Nem sikerült létrehozni a foglalást.')
            };
        } catch (error) {
            console.warn('Lumi Nails biztonságos foglalási function hiba:', error);
            return { ok: false, error };
        }
    }

    function ujFoglalasMuveletAzonosito() {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function foglalasKeresKulcsa(adatok) {
        const ujjlenyomat = JSON.stringify({
            service_id: adatok.szolgaltatasId,
            customer_name: adatok.nev,
            customer_phone: adatok.telefon,
            customer_email: adatok.email,
            note: adatok.megjegyzes,
            starts_at: adatok.startsAt,
            coupon_id: adatok.kupon?.id || null,
            coupon_code: adatok.kupon?.code || null
        });

        if (!allapot.foglalasKeresKulcs || allapot.foglalasKeresUjjlenyomat !== ujjlenyomat) {
            allapot.foglalasKeresKulcs = ujFoglalasMuveletAzonosito();
            allapot.foglalasKeresUjjlenyomat = ujjlenyomat;
        }

        return allapot.foglalasKeresKulcs;
    }

    function foglalasKeresKulcsTorlese() {
        allapot.foglalasKeresKulcs = '';
        allapot.foglalasKeresUjjlenyomat = '';
    }

    async function inspiraciosKepekElokeszitese(files, statuszElem) {
        const kepek = [];

        for (let index = 0; index < files.length; index += 1) {
            statuszKiirasa(statuszElem, `Képek előkészítése: ${index + 1}/${files.length}`);
            const elokeszites = await inspiraciosKepElokeszitese(files[index]);

            if (!elokeszites.ok) {
                return elokeszites;
            }

            kepek.push(elokeszites.adat);
        }

        return { ok: true, kepek };
    }

    async function inspiraciosKepElokeszitese(file) {
        const hiba = kepFajlHiba(file);
        if (hiba) return { ok: false, uzenet: hiba };

        try {
            const optimalizalt = await kepOptimalizalasa(file, {
                maxSide: IMAGE_UPLOAD_MAX_SIDE,
                quality: IMAGE_UPLOAD_WEBP_QUALITY
            });
            const feltoltendo = optimalizalt.file;

            return {
                ok: true,
                adat: {
                    file: feltoltendo,
                    name: file.name,
                    type: feltoltendo.type || '',
                    size: feltoltendo.size,
                    originalName: file.name,
                    originalType: file.type || '',
                    originalSize: file.size,
                    optimized: optimalizalt.optimized
                }
            };
        } catch (error) {
            console.error('Inspirációs kép előkészítési kivétel:', error);
            return {
                ok: false,
                uzenet: error?.message || 'A képet nem sikerült előkészíteni. Kérlek próbáld újra.'
            };
        }
    }

    async function inspiraciosKepekFeltoltese(bookingId, requestKey, adatok, inspiraciok) {
        try {
            const body = new FormData();
            body.append('booking_id', bookingId);
            body.append('request_key', requestKey || '');
            body.append('nail_style', adatok.koromStilus || '');
            body.append('nail_style_note', adatok.eredetiMegjegyzes || '');
            body.append('metadata', JSON.stringify(inspiraciok.map(({ file: _file, ...meta }) => meta)));
            inspiraciok.forEach((kep, index) => body.append(`file_${index}`, kep.file, kep.file.name));

            const { data, error } = await allapot.kliens.functions.invoke('upload-booking-inspirations', { body });

            if (error || !data?.ok) {
                console.warn('Inspirációs képek biztonságos feltöltése nem sikerült:', error || data);
                return { ok: false, error: error || data?.error };
            }

            return { ok: true };
        } catch (error) {
            console.warn('Inspirációs képek biztonságos feltöltési kivétel:', error);
            return { ok: false, error };
        }
    }
    function foglalasAdatok(elemek) {
        const koromStilus = valasztottKoromStilus();
        const eredetiMegjegyzes = elemek.komment.value.trim();
        const szolgaltatas = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === elemek.szolgaltatas.value);
        const kupon = kuponOsszegAdatok(szolgaltatas, allapot.aktivKupon);
        const megjegyzes = foglalasMegjegyzes(koromStilus, eredetiMegjegyzes, kupon);

        return {
            nev: elemek.nev.value.trim(),
            telefon: `+36 ${elemzesTelefon(elemek.telefon.value)}`,
            telefonSzamok: elemzesTelefon(elemek.telefon.value),
            email: elemek.email.value.trim().toLowerCase(),
            szolgaltatasId: elemek.szolgaltatas.value,
            szolgaltatas,
            kupon,
            datum: elemek.datum.value,
            startsAt: elemek.ido.value,
            koromStilus,
            eredetiMegjegyzes,
            megjegyzes,
            kepFiles: Array.from(elemek.kepInput?.files || [])
        };
    }

    function foglalasMegjegyzes(koromStilus, megjegyzes, kupon) {
        const sorok = [];
        if (koromStilus) sorok.push(`Köröm stílus: ${koromStilus}`);
        if (megjegyzes) sorok.push(`Elképzelés / megjegyzés: ${megjegyzes}`);
        if (kupon?.code) {
            sorok.push(`Kupon: ${kupon.code} (${kupon.title || kupon.discountLabel || 'kedvezmény'})`);
            if (kupon.decorationOnly) {
                sorok.push(`Kupon részlete: ${kupon.discountLabel}. A végösszeg a választott díszítés alapján kerül meghatározásra.`);
            } else {
                if (kupon.baseLabel) sorok.push(`Alapár: ${kupon.baseLabel}`);
                if (kupon.discountAmount > 0) sorok.push(`Kedvezmény: -${arFelirat(kupon.discountAmount, kupon.unit)}`);
                if (kupon.finalLabel) sorok.push(`Végösszeg: ${kupon.finalLabel}`);
            }
        }
        return sorok.join('\n');
    }

    function foglalasHiba(adatok, elemek) {
        if (!adatok.szolgaltatasId) {
            return hibaAdat('Kérlek válassz szolgáltatást.', '[data-step="1"]', elemek.szolgaltatasKartyak);
        }

        if (!adatok.koromStilus) {
            return hibaAdat('Kérlek jelöld, hogy egyszerű, francia vagy festett/díszített körmöt szeretnél.', '[data-step="2"]', document.getElementById('foglalas-stilus-racs'));
        }

        if (!adatok.datum) {
            return hibaAdat('Kérlek válassz dátumot.', '[data-step="3"]', elemek.datumKartyak);
        }

        if (!adatok.startsAt) {
            return hibaAdat('Kérlek válassz időpontot.', '[data-step="3"]', elemek.idoKartyak);
        }

        if (!adatok.nev) {
            return hibaAdat('Kérlek add meg a neved.', '[data-step="5"]', elemek.nev, elemek.nev);
        }

        if (!adatok.telefonSzamok) {
            return hibaAdat('Kérlek add meg a telefonszámod.', '[data-step="5"]', elemek.telefon.closest('.tel-csoport') || elemek.telefon, elemek.telefon);
        }

        if (adatok.telefonSzamok.length !== 9) {
            return hibaAdat('Kérlek 9 számjegyű magyar mobilszámot adj meg, országkód nélkül. Példa: 301234567', '[data-step="5"]', elemek.telefon.closest('.tel-csoport') || elemek.telefon, elemek.telefon);
        }

        if (!adatok.email) {
            return hibaAdat('Kérlek add meg az email címed.', '[data-step="5"]', elemek.email, elemek.email);
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adatok.email)) {
            return hibaAdat('Kérlek valós email címet adj meg.', '[data-step="5"]', elemek.email, elemek.email);
        }

        if (elemek.kuponInput?.value.trim() && !adatok.kupon?.code) {
            return hibaAdat('A kuponkódot előbb érvényesítsd, vagy töröld a mezőből.', '[data-step="5"]', elemek.kuponBlokk, elemek.kuponInput);
        }

        if (ujVendegKupon(allapot.aktivKupon) && allapot.aktivKupon.ellenorzottEmail !== adatok.email) {
            return hibaAdat('Az \u00faj vend\u00e9g kupont az aktu\u00e1lis email c\u00edmmel \u00fajra kell \u00e9rv\u00e9nyes\u00edteni.', '[data-step="5"]', elemek.kuponBlokk, elemek.kuponInput);
        }

        if (adatok.datum < maiDatum()) {
            return hibaAdat('Múltbeli dátumra nem lehet időpontot foglalni.', '[data-step="3"]', elemek.datumKartyak);
        }

        if (adatok.kepFiles.length > MAX_IMAGE_COUNT) {
            return hibaAdat(`Legfeljebb ${MAX_IMAGE_COUNT} inspirációs képet tölthetsz fel.`, '[data-step="4"]', document.querySelector('.foglalas-kepfeltoltes'), elemek.kepInput);
        }

        for (const file of adatok.kepFiles) {
            const kepHiba = kepFajlHiba(file);
            if (kepHiba) {
                return hibaAdat(kepHiba, '[data-step="4"]', document.querySelector('.foglalas-kepfeltoltes'), elemek.kepInput);
            }
        }

        return null;
    }

    function hibaAdat(uzenet, cel, elem, fokusz) {
        return { uzenet, cel, elem, fokusz };
    }

    function foglalasHibaMutatasa(elemek, hiba) {
        hibakTorlese(elemek);
        statuszKiirasa(elemek.statusz, hiba.uzenet, true);

        const cel = typeof hiba.cel === 'string' ? document.querySelector(hiba.cel) : hiba.cel;
        const elem = hiba.elem || cel;

        cel?.classList.add('foglalas-hiba-szekcio');
        elem?.classList.add('foglalas-hibas-mezo');
        elem?.setAttribute?.('aria-invalid', 'true');

        kovetkezoReszhezGordit(cel || elem);

        if (hiba.fokusz && typeof hiba.fokusz.focus === 'function') {
            hiba.fokusz.focus({ preventScroll: true });
        }
    }

    function hibakTorlese(elemek) {
        elemek.urlap?.querySelectorAll('.foglalas-hiba-szekcio, .foglalas-hibas-mezo').forEach(elem => {
            elem.classList.remove('foglalas-hiba-szekcio', 'foglalas-hibas-mezo');
            elem.removeAttribute('aria-invalid');
        });
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

    async function kuponokBetoltese(elemek) {
        if (!elemek.kuponBlokk || !allapot.kliens) return;

        try {
            let { data, error } = await allapot.kliens
                .from('coupons')
                .select('id,code,title,description,discount_type,discount_value,discount_text,service_id,service_category,customer_scope,valid_from,valid_until,active,show_on_home,sort_order')
                .eq('active', true)
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });

            if (error && adatbazisOszlopHiany(error, ['service_category', 'customer_scope'])) {
                ({ data, error } = await allapot.kliens
                    .from('coupons')
                    .select('id,code,title,description,discount_type,discount_value,discount_text,service_id,valid_from,valid_until,active,show_on_home,sort_order')
                    .eq('active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: true }));
            }

            if (error) {
                kuponMezoLathatosag(elemek, false);
                return;
            }

            allapot.kuponok = aktivKuponok(data || []);
            kuponMezoLathatosag(elemek, allapot.kuponok.length > 0);
            kuponUrlbolBetoltese(elemek);
        } catch (_error) {
            allapot.kuponok = [];
            kuponMezoLathatosag(elemek, false);
        }
    }

    function aktivKuponok(kuponok) {
        const ma = maiDatum();
        return kuponok.filter(kupon => kupon.active !== false)
            .filter(kupon => !kupon.valid_from || kupon.valid_from <= ma)
            .filter(kupon => !kupon.valid_until || kupon.valid_until >= ma);
    }

    function kuponUrlbolBetoltese(elemek) {
        if (!elemek.kuponInput || elemek.kuponInput.value.trim()) return;
        const params = new URLSearchParams(window.location.search);
        const kod = (params.get('kupon') || params.get('coupon') || '').trim().toUpperCase();
        if (!kod) return;

        elemek.kuponInput.value = kod;
        kuponEllenorzese(elemek, { varakozzSzolgaltatasra: true }).catch(error => {
            console.warn('Kupon URL ellen\u0151rz\u00e9si hiba:', error);
            kuponStatusz(elemek, supabaseHiba(error), true);
        });
    }

    function kuponMezoLathatosag(elemek, lathato) {
        if (!elemek.kuponBlokk) return;
        elemek.kuponBlokk.hidden = !lathato;
        if (!lathato) {
            allapot.aktivKupon = null;
            if (elemek.kuponInput) elemek.kuponInput.value = '';
            kuponStatusz(elemek, '');
        }
    }

    async function kuponEllenorzese(elemek, opciok = {}) {
        const kod = elemek.kuponInput?.value.trim().toUpperCase() || '';
        const ellenorzesAzonosito = allapot.kuponEllenorzesAzonosito + 1;
        allapot.kuponEllenorzesAzonosito = ellenorzesAzonosito;
        allapot.aktivKupon = null;

        if (!kod) {
            kuponStatusz(elemek, kuponUzenet('ures', '\u00cdrd be a kuponk\u00f3dot.'), true);
            osszefoglaloFrissitese(elemek);
            return;
        }

        const szolgaltatasId = elemek.szolgaltatas.value;
        const szolgaltatasObj = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === szolgaltatasId);
        const kupon = allapot.kuponok.find(elem => String(elem.code || '').toUpperCase() === kod);

        if (!kupon) {
            kuponStatusz(elemek, kuponUzenet('nincsAktiv', 'Nem tal\u00e1ltam ilyen akt\u00edv kupont.'), true);
            osszefoglaloFrissitese(elemek);
            return;
        }

        if (szolgaltatasId && !kuponSzolgaltatasraErvenyes(kupon, szolgaltatasObj, szolgaltatasId)) {
            kuponStatusz(elemek, kuponDiszitesKiegeszito(kupon)
                ? 'Ez a kupon akkor \u00e9rv\u00e9nyes, ha a Fest\u00e9s / d\u00edsz\u00edt\u00e9s st\u00edlust v\u00e1lasztod.'
                : kuponUzenet('masikSzolgaltatas', 'Ez a kupon nem ehhez a szolg\u00e1ltat\u00e1shoz vagy kateg\u00f3ri\u00e1hoz \u00e9rv\u00e9nyes.'), true);
            osszefoglaloFrissitese(elemek);
            return;
        }

        if (ujVendegKupon(kupon)) {
            const email = elemek.email?.value.trim().toLowerCase() || '';
            if (!email) {
                kuponStatusz(elemek, kuponUzenet('ujVendegEmailHiany', 'Ehhez a kuponhoz add meg el\u0151bb az email c\u00edmed, mert csak \u00faj vend\u00e9geknek \u00e9rv\u00e9nyes.'), true);
                elemek.email?.classList.add('foglalas-hibas-mezo');
                elemek.email?.setAttribute('aria-invalid', 'true');
                osszefoglaloFrissitese(elemek);
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                kuponStatusz(elemek, kuponUzenet('ujVendegEmailHibas', 'A kupon ellen\u0151rz\u00e9s\u00e9hez val\u00f3s email c\u00edmet adj meg.'), true);
                elemek.email?.classList.add('foglalas-hibas-mezo');
                elemek.email?.setAttribute('aria-invalid', 'true');
                osszefoglaloFrissitese(elemek);
                return;
            }

            kuponStatusz(elemek, kuponUzenet('ujVendegEllenorzes', 'Kupon ellen\u0151rz\u00e9se email alapj\u00e1n...'));
            const ujVendegEredmeny = await ujVendegKuponEllenorzese(email);
            if (ellenorzesAzonosito !== allapot.kuponEllenorzesAzonosito) return;

            if (!ujVendegEredmeny.ok) {
                kuponStatusz(elemek, kuponUzenet('ujVendegEllenorzesHiba', 'Most nem siker\u00fclt ellen\u0151rizni az \u00faj vend\u00e9g kupont. K\u00e9rlek pr\u00f3b\u00e1ld \u00fajra.'), true);
                osszefoglaloFrissitese(elemek);
                return;
            }

            if (ujVendegEredmeny.vanKorabbiFoglalas) {
                kuponStatusz(elemek, kuponUzenet('ujVendegMarVolt', 'Ez a kupon csak \u00faj vend\u00e9geknek \u00e9rv\u00e9nyes. Ezzel az email c\u00edmmel m\u00e1r volt foglal\u00e1s.'), true);
                osszefoglaloFrissitese(elemek);
                return;
            }

            kupon.ellenorzottEmail = email;
        }

        allapot.aktivKupon = kupon;
        kuponStatusz(elemek, szolgaltatasId
            ? (kuponDiszitesKiegeszito(kupon)
                ? `${kupon.code} kupon \u00e9rv\u00e9nyes az extra d\u00edsz\u00edt\u00e9sre. A v\u00e9g\u00f6sszeget a v\u00e1lasztott minta alapj\u00e1n egyeztetj\u00fck.`
                : kuponUzenet('ervenyes', '{kod} kupon \u00e9rv\u00e9nyes\u00edtve.', { kod: kupon.code }))
            : kuponUzenet('ervenyes', '{kod} kupon el\u0151k\u00e9sz\u00edtve. V\u00e1lassz szolg\u00e1ltat\u00e1st, \u00e9s ellen\u0151rz\u00f6m.', { kod: kupon.code }));
        osszefoglaloFrissitese(elemek);
    }

    function kuponSzolgaltatasValtozott(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;
        const szolgaltatasObj = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === szolgaltatasId);

        const elozoKupon = allapot.aktivKupon;
        if (elozoKupon && !kuponSzolgaltatasraErvenyes(elozoKupon, szolgaltatasObj, szolgaltatasId)) {
            allapot.aktivKupon = null;
            kuponStatusz(elemek, kuponDiszitesKiegeszito(elozoKupon)
                ? 'A d\u00edsz\u00edt\u00e9skupon csak a Fest\u00e9s / d\u00edsz\u00edt\u00e9s st\u00edlus mellett \u00e9rv\u00e9nyes.'
                : kuponUzenet('szolgaltatasValtozott', 'A v\u00e1lasztott kupon m\u00e1sik szolg\u00e1ltat\u00e1shoz vagy kateg\u00f3ri\u00e1hoz tartozik.'), true);
        } else if (elemek.kuponInput?.value.trim() && !allapot.aktivKupon) {
            kuponEllenorzese(elemek).catch(error => {
                console.warn('Kupon \u00fajraellen\u0151rz\u00e9si hiba:', error);
                kuponStatusz(elemek, supabaseHiba(error), true);
            });
        }

        osszefoglaloFrissitese(elemek);
    }

    function kuponSzolgaltatasraErvenyes(kupon, szolgaltatas, szolgaltatasId) {
        if (!kupon) return false;
        if (kuponDiszitesKiegeszito(kupon)) return diszitettStilusKivalasztva();
        if (!kupon.service_id && !kupon.service_category) return true;
        if (!szolgaltatasId) return true;
        if (kupon.service_id) return kupon.service_id === szolgaltatasId;
        return szolgaltatasKuponKategoria(szolgaltatas) === kupon.service_category;
    }

    function kuponDiszitesKiegeszito(kupon) {
        return normalizaltKuponSzoveg(kupon?.service_category) === 'diszites';
    }

    function diszitettStilusKivalasztva() {
        const stilus = normalizaltKuponSzoveg(valasztottKoromStilus());
        return stilus.includes('diszit') || stilus.includes('fest');
    }

    function normalizaltKuponSzoveg(ertek) {
        return String(ertek || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('hu-HU')
            .trim();
    }


    function ujVendegKupon(kupon) {
        return String(kupon?.customer_scope || 'all') === 'new_customer';
    }

    async function ujVendegKuponEllenorzese(email) {
        if (!allapot.kliens?.rpc) return { ok: false };

        const { data, error } = await allapot.kliens.rpc('lumi_customer_has_previous_booking', {
            p_customer_email: email
        });

        if (error) {
            console.warn('\u00daj vend\u00e9g kupon ellen\u0151rz\u00e9si hiba:', error);
            return { ok: false, error };
        }

        return { ok: true, vanKorabbiFoglalas: Boolean(data) };
    }

    function szolgaltatasKuponKategoria(szolgaltatas) {
        const szoveg = `${szolgaltatas?.name || ''} ${szolgaltatas?.description || ''}`.toLocaleLowerCase('hu-HU');
        if (szoveg.includes('\u00e9p\u00edt')) return '\u00c9p\u00edt\u00e9s';
        if (szoveg.includes('t\u00f6lt')) return 'T\u00f6lt\u00e9s';
        if (szoveg.includes('g\u00e9l lakk') || szoveg.includes('g\u00e9llakk') || szoveg.includes('gel lakk')) return 'G\u00e9l lakk';
        if (szoveg.includes('manik')) return 'Manik\u0171r';
        if (szoveg.includes('d\u00edsz') || szoveg.includes('nail art') || szoveg.includes('k\u0151')) return 'D\u00edsz\u00edt\u00e9s';
        if (szoveg.includes('leszed')) return 'Leszed\u00e9s';
        return '';
    }

    function kuponStatusz(elemek, uzenet, hiba = false) {
        if (!elemek.kuponStatusz) return;
        elemek.kuponStatusz.textContent = uzenet;
        elemek.kuponStatusz.classList.toggle('hiba', Boolean(hiba));
    }

    function kuponUzenet(kulcs, alap, adatok = {}) {
        const sablon = window.lumiAdatok?.foglalas?.kuponUzenetek?.[kulcs] || alap;
        return String(sablon || '')
            .replace(/\{kod\}/g, adatok.kod || '')
            .replace(/\{email\}/g, adatok.email || '');
    }

    function kuponOsszegAdatok(szolgaltatas, kupon) {
        const amount = Number(szolgaltatas?.price_amount) || 0;
        const unit = szolgaltatas?.price_unit || 'Ft';
        const baseLabel = amount ? arFelirat(amount, unit) : szolgaltatasArFelirat(szolgaltatas);

        if (!kupon?.code) {
            return { baseAmount: amount, unit, baseLabel };
        }

        const decorationOnly = kuponDiszitesKiegeszito(kupon);
        let discountLabel = kupon.discount_text || kuponKedvezmenyFelirat(kupon);
        if (decorationOnly && !normalizaltKuponSzoveg(discountLabel).includes('diszit')) {
            discountLabel = `${discountLabel} az extra d\u00edsz\u00edt\u00e9s \u00e1r\u00e1b\u00f3l`;
        }
        const discountAmount = decorationOnly ? 0 : kuponKedvezmenyOsszeg(amount, kupon);
        const finalAmount = decorationOnly ? 0 : (amount ? Math.max(0, amount - discountAmount) : 0);

        return {
            id: kupon.id,
            code: kupon.code,
            title: kupon.title,
            discountLabel,
            discountType: kupon.discount_type,
            discountValue: Number(kupon.discount_value) || 0,
            baseAmount: amount,
            unit,
            baseLabel,
            discountAmount,
            finalAmount,
            finalLabel: !decorationOnly && amount && kupon.discount_type !== 'text' ? arFelirat(finalAmount, unit) : '',
            decorationOnly
        };
    }

    function kuponKedvezmenyOsszeg(amount, kupon) {
        if (!amount || !kupon) return 0;
        const value = Number(kupon.discount_value) || 0;
        if (kupon.discount_type === 'percent') return Math.min(amount, Math.round(amount * value / 100));
        if (kupon.discount_type === 'fixed') return Math.min(amount, value);
        return 0;
    }

    function kuponKedvezmenyFelirat(kupon) {
        const value = Number(kupon?.discount_value) || 0;
        if (kupon?.discount_type === 'percent') return `${value}% kedvezmény`;
        if (kupon?.discount_type === 'fixed') return `${arFelirat(value, 'Ft')} kedvezmény`;
        return kupon?.title || 'Akció';
    }

    function szolgaltatasArNormalizalasa(szolgaltatas) {
        const priceText = szolgaltatas.price_text || '';
        const priceAmount = Number.isFinite(Number(szolgaltatas.price_amount)) && Number(szolgaltatas.price_amount) > 0
            ? Number(szolgaltatas.price_amount)
            : arOsszegKinyerese(priceText);
        const priceUnit = szolgaltatas.price_unit || arEgysegKinyerese(priceText) || 'Ft';

        return {
            ...szolgaltatas,
            price_amount: priceAmount || null,
            price_unit: priceUnit,
            price_suffix: '',
            price_text: priceText || arFelirat(priceAmount, priceUnit)
        };
    }

    function szolgaltatasArFelirat(szolgaltatas) {
        if (!szolgaltatas) return '';
        return arFelirat(szolgaltatas.price_amount, szolgaltatas.price_unit) || szolgaltatas.price_text || '';
    }

    function arFelirat(osszeg, egyseg = 'Ft') {
        const nyers = String(osszeg ?? '').trim();
        if (!nyers) return '';
        if (/[^\d\s.,\-\u2013]/.test(nyers)) return nyers;

        const csakSzam = nyers.replace(/[\s.]/g, '');
        const ertek = /^\d+$/.test(csakSzam)
            ? Number.parseInt(csakSzam, 10).toLocaleString('hu-HU')
            : nyers;

        return `${ertek} ${egyseg || 'Ft'}`.trim();
    }

    function arSzamolhatoOsszeg(ertek) {
        const nyers = String(ertek || '').trim();
        if (!nyers || /[-\u2013]/.test(nyers)) return null;
        const csakSzam = nyers.replace(/\D/g, '');
        const szam = Number.parseInt(csakSzam, 10);
        return Number.isFinite(szam) && szam > 0 ? szam : null;
    }

    function arErtekKinyerese(szoveg) {
        const tiszta = String(szoveg || '').replace(/\s+/g, ' ').trim();
        const tartomany = tiszta.match(/\d[\d\s.]*(?:[-\u2013]\s*\d[\d\s.]*)/);
        if (tartomany) return tartomany[0].replace(/[\s.]/g, '');
        const egyszeru = tiszta.match(/\d[\d\s.]*/);
        return egyszeru ? egyszeru[0].replace(/[\s.]/g, '') : '';
    }

    function arOsszegKinyerese(szoveg) {
        return arSzamolhatoOsszeg(arErtekKinyerese(szoveg)) || 0;
    }

    function arEgysegKinyerese(szoveg) {
        const kis = String(szoveg || '').toLowerCase();
        if (kis.includes('/ db')) return 'Ft / db';
        if (kis.includes('/ ujj')) return 'Ft / ujj';
        if (kis.includes('-tól') || kis.includes('-tol')) return 'Ft-tól';
        if (kis.includes('ft')) return 'Ft';
        if (kis.includes('db')) return 'db';
        if (kis.includes('ujj')) return 'ujj';
        return 'Ft';
    }

    function adatbazisOszlopHiany(error, oszlopok = []) {
        const uzenet = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return oszlopok.some(oszlop => uzenet.includes(oszlop.toLowerCase())) || uzenet.includes('schema cache') && (uzenet.includes('column') || uzenet.includes('function'));
    }

    function osszefoglaloFrissitese(elemek) {
        if (!elemek.osszefoglalo) return;

        const szolgaltatasObj = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === elemek.szolgaltatas.value);
        const szolgaltatas = szolgaltatasObj ? (szolgaltatasObj.description?.trim() || szolgaltatasObj.name) : selectedText(elemek.szolgaltatas);
        const stilus = valasztottKoromStilus();
        const extraPerc = stilusExtraPerc();
        const datum = selectedText(elemek.datum);
        const ido = selectedText(elemek.ido);
        const files = Array.from(elemek.kepInput?.files || []);
        const megjegyzes = elemek.komment?.value.trim() || '';
        const nev = elemek.nev?.value.trim() || '';
        const telefon = elemzesTelefon(elemek.telefon?.value || '');
        const email = elemek.email?.value.trim() || '';
        const kupon = kuponOsszegAdatok(szolgaltatasObj, allapot.aktivKupon);

        const sorok = [
            ['Szolgáltatás', szolgaltatas],
            ['Stílus', stilus ? `${stilus}${extraPerc ? ` (+${extraPerc} perc)` : ''}` : ''],
            ['Időpont', [datum, ido].filter(Boolean).join(' · ')],
            ['Alapár', kupon.baseLabel || (szolgaltatasObj ? szolgaltatasArFelirat(szolgaltatasObj) : '')],
            ['Kupon', kupon.code ? `${kupon.code} - ${kupon.discountLabel}` : ''],
            ['Kedvezmény', !kupon.decorationOnly && kupon.discountAmount > 0 ? `-${arFelirat(kupon.discountAmount, kupon.unit)}` : ''],
            ['Elszámolás', kupon.decorationOnly ? 'A kupon csak az extra díszítés árára vonatkozik; a végösszeg a választott minta alapján kerül meghatározásra.' : ''],
            ['Végösszeg', kupon.decorationOnly ? '' : kupon.finalLabel || ''],
            ['Inspiráció', files.length ? `${files.length} kép kiválasztva` : ''],
            ['Megjegyzés', megjegyzes],
            ['Elérhetőség', [nev, telefon ? `+36 ${telefon}` : '', email].filter(Boolean).join(' · ')]
        ].filter(([, ertek]) => ertek);

        if (!sorok.length) {
            elemek.osszefoglalo.innerHTML = '<h3>Foglalás összefoglaló</h3><p>Válaszd ki a szolgáltatást, stílust, dátumot és időpontot, és itt látod majd egyben a foglalásodat.</p>';
            return;
        }

        elemek.osszefoglalo.innerHTML = `
            <h3>Foglalás összefoglaló</h3>
            <dl>${sorok.map(([cim, ertek]) => `<div class="${cim === 'Végösszeg' ? 'foglalas-vegosszeg-sor' : ''}"><dt>${html(cim)}</dt><dd>${html(ertek)}</dd></div>`).join('')}</dl>
        `;
    }

    function selectedText(select) {
        const option = select?.selectedOptions?.[0];
        if (!option || !option.value) return '';
        return option.textContent.trim();
    }

    function kovetkezoReszhezGordit(cel) {
        const elem = typeof cel === 'string' ? document.querySelector(cel) : cel;
        if (!elem) return;

        window.cancelAnimationFrame(kovetkezoReszhezGordit.renderKeret);
        kovetkezoReszhezGordit.renderKeret = window.requestAnimationFrame(() => {
            const fejlec = document.querySelector('.site-header');
            const fejlecMagassag = fejlec ? Math.ceil(fejlec.offsetHeight) : 0;
            const res = window.matchMedia('(max-width: 760px)').matches ? 18 : 24;
            const aktualisPozicio = window.scrollY || document.documentElement.scrollTop || 0;
            const celPozicio = elem.getBoundingClientRect().top + aktualisPozicio - fejlecMagassag - res;
            const csokkentettMozgas = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            window.scrollTo({
                top: Math.max(0, Math.min(celPozicio, document.documentElement.scrollHeight - window.innerHeight)),
                behavior: csokkentettMozgas ? 'auto' : 'smooth'
            });
        });
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
        elem.classList.toggle('foglalas-statusz-kiemelt', Boolean(hiba && szoveg));
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

    function sikeresPopupNyitasa(emailEredmeny = { ok: false }, bookingReference = '') {
        const popup = document.getElementById('sikeres-popup');
        const popupCim = popup?.querySelector('.popup-cim');
        const popupSzoveg = popup?.querySelector('.popup-szoveg');
        const kodBlokk = document.getElementById('foglalas-popup-azonosito');
        const kodElem = document.getElementById('foglalas-popup-kod');
        const kezeloLink = document.getElementById('foglalas-popup-kezeles');
        const popupAdatok = window.lumiAdatok?.foglalas?.popup || {};
        const emailSikerult = Boolean(emailEredmeny.ok);
        const kod = foglalasAzonositoFormazasa(bookingReference);

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

        if (kodBlokk) kodBlokk.hidden = !kod;
        if (kodElem) kodElem.textContent = kod;
        if (kezeloLink && kod) {
            kezeloLink.href = `/foglalas/?foglalas=${encodeURIComponent(kod)}#foglalas-ellenorzes`;
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
        const ar = szolgaltatasArFelirat(szolgaltatas);
        if (ar) reszek.push(ar);
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

    function foglalasKezeloBekotese() {
        const form = document.getElementById('foglalas-ellenorzes-urlap');
        const input = document.getElementById('foglalas-azonosito');
        const eredmeny = document.getElementById('foglalas-ellenorzes-eredmeny');
        const statusz = document.getElementById('foglalas-ellenorzes-status');
        const lemondas = document.getElementById('foglalas-lemondas');
        const lemondasMegjegyzesBlokk = document.getElementById('foglalas-lemondas-megjegyzes-blokk');
        const lemondasMegjegyzes = document.getElementById('foglalas-lemondas-megjegyzes');
        if (!form || !input || !eredmeny || !statusz || !lemondas || !lemondasMegjegyzesBlokk || !lemondasMegjegyzes) return;
        const elemek = { input, eredmeny, statusz, lemondas, lemondasMegjegyzesBlokk, lemondasMegjegyzes };

        form.addEventListener('submit', event => {
            event.preventDefault();
            foglalasStatuszLekerdezese(input.value, elemek);
        });
        input.addEventListener('input', () => {
            input.value = foglalasAzonositoFormazasa(input.value);
            foglalasKezeloUzenet(statusz, '');
        });
        lemondas.addEventListener('click', () => foglalasLemondasa(input.value, elemek));

        const urlKod = new URLSearchParams(window.location.search).get('foglalas');
        if (urlKod) {
            input.value = foglalasAzonositoFormazasa(urlKod);
            foglalasStatuszLekerdezese(input.value, elemek);
        }
    }

    function foglalasAzonositoFormazasa(ertek) {
        let kod = String(ertek || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (kod.startsWith('LUMI')) kod = kod.slice(4);
        kod = kod.slice(0, 20);
        const csoportok = kod.match(/.{1,4}/g) || [];
        return kod ? `LUMI-${csoportok.join('-')}` : '';
    }

    function foglalasAzonositoErvenyes(kod) {
        return /^LUMI-[A-Z0-9]{4}$/.test(kod) || /^LUMI(?:-[A-Z0-9]{4}){5}$/.test(kod);
    }

    async function foglalasStatuszLekerdezese(azonosito, elemek) {
        const kod = foglalasAzonositoFormazasa(azonosito);
        if (!foglalasAzonositoErvenyes(kod)) {
            foglalasKezeloUzenet(elemek.statusz, 'Írd be a teljes, LUMI kezdetű foglalási azonosítót.', true);
            elemek.eredmeny.hidden = true;
            return;
        }
        elemek.input.value = kod;
        elemek.input.disabled = true;
        foglalasKezeloUzenet(elemek.statusz, 'Foglalás lekérése...');
        const { data, error } = await allapot.kliens.rpc('get_booking_status', { p_reference: kod });
        elemek.input.disabled = false;

        if (error) {
            console.warn('Foglalás státusz lekérési hiba:', error);
            foglalasKezeloUzenet(elemek.statusz, 'A foglalás most nem kérdezhető le. Kérlek, próbáld újra később.', true);
            elemek.eredmeny.hidden = true;
            return;
        }
        const foglalas = Array.isArray(data) ? data[0] : data;
        if (!foglalas) {
            foglalasKezeloUzenet(elemek.statusz, 'Nem találtam foglalást ezzel az azonosítóval. Ellenőrizd a kódot.', true);
            elemek.eredmeny.hidden = true;
            return;
        }
        foglalasKezeloRenderelese(foglalas, elemek);
        foglalasKezeloUzenet(elemek.statusz, '');
    }

    function foglalasKezeloRenderelese(foglalas, elemek) {
        const idopont = new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest'
        }).format(new Date(foglalas.starts_at));
        const idopontVege = new Intl.DateTimeFormat('hu-HU', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest'
        }).format(new Date(foglalas.ends_at));
        const arOsszeg = foglalas.final_price_amount ?? foglalas.service_price_amount;
        const arSzam = Number(arOsszeg);
        const ar = arOsszeg !== null && arOsszeg !== undefined && Number.isFinite(arSzam)
            ? `${new Intl.NumberFormat('hu-HU').format(arSzam)} ${foglalas.service_price_unit || 'Ft'}`
            : foglalas.service_price_text || '';
        const reszletek = [
            ['Szolgáltatás', foglalas.service_name],
            ['Ár', ar],
            ['Körömstílus', foglalas.nail_style],
            ['Időpont', `${idopont} – ${idopontVege}`],
            ['Kupon', foglalas.coupon_label]
        ].filter(([, ertek]) => Boolean(ertek));
        const kotelezoIndok = Boolean(foglalas.cancellation_note_required);
        const lemondasSzoveg = foglalas.can_cancel && kotelezoIndok
            ? 'Az időpont 24 órán belül kezdődik, ezért a lemondás rövid indoklása kötelező.'
            : foglalas.can_cancel
                ? elemek.lemondas.dataset.leiras || 'Ha mégsem megfelelő az időpont, itt lemondhatod.'
            : 'Ez a foglalás már nem mondható le online.';

        elemek.eredmeny.innerHTML = `
            <div class="foglalas-kezelo-fej">
                <span class="foglalas-statusz-jelzo foglalas-statusz-${html(foglalas.status)}">${html(foglalas.status_label)}</span>
                <strong>${html(foglalas.booking_reference)}</strong>
            </div>
            <dl>
                ${reszletek.map(([cimke, ertek]) => `<div><dt>${html(cimke)}</dt><dd>${html(ertek)}</dd></div>`).join('')}
            </dl>
            <p class="foglalas-lemondas-hatarido">${lemondasSzoveg}</p>
        `;
        elemek.eredmeny.appendChild(elemek.lemondasMegjegyzesBlokk);
        elemek.eredmeny.appendChild(elemek.lemondas);
        elemek.lemondasMegjegyzesBlokk.hidden = !foglalas.can_cancel;
        const megjegyzesCimke = elemek.lemondasMegjegyzesBlokk.querySelector('span');
        if (megjegyzesCimke) {
            megjegyzesCimke.textContent = kotelezoIndok
                ? 'Lemondás oka vagy megjegyzés (24 órán belül kötelező)'
                : 'Lemondás oka vagy megjegyzés (opcionális)';
        }
        elemek.lemondasMegjegyzes.required = kotelezoIndok;
        elemek.lemondasMegjegyzes.dataset.requiredWithin24h = String(kotelezoIndok);
        elemek.lemondasMegjegyzes.placeholder = kotelezoIndok
            ? 'Kérlek, röviden írd meg a lemondás okát.'
            : 'Ha szeretnéd, írd meg röviden a lemondás okát.';
        elemek.lemondas.hidden = !foglalas.can_cancel;
        elemek.lemondas.disabled = false;
        elemek.lemondas.textContent = elemek.lemondas.dataset.felirat || 'Foglalás lemondása';
        elemek.eredmeny.hidden = false;
    }

    async function foglalasLemondasa(azonosito, elemek) {
        const kod = foglalasAzonositoFormazasa(azonosito);
        const megjegyzes = elemek.lemondasMegjegyzes.value.trim().slice(0, 500);
        if (elemek.lemondasMegjegyzes.dataset.requiredWithin24h === 'true' && !megjegyzes) {
            foglalasKezeloUzenet(elemek.statusz, 'A 24 órán belüli lemondáshoz írj rövid indokot.', true);
            elemek.lemondasMegjegyzes.focus();
            return;
        }
        if (!window.confirm('Biztosan lemondod ezt a foglalást? Ez a művelet nem vonható vissza.')) return;
        elemek.lemondas.disabled = true;
        elemek.lemondas.textContent = 'Lemondás folyamatban...';
        const { data, error } = await allapot.kliens.rpc('cancel_booking_by_reference', {
            p_reference: kod,
            p_note: megjegyzes
        });
        const valasz = Array.isArray(data) ? data[0] : data;
        if (error || !valasz?.success) {
            console.warn('Foglalás lemondási hiba:', error || valasz);
            foglalasKezeloUzenet(elemek.statusz, valasz?.message || 'A lemondás most nem sikerült. Kérlek, próbáld újra később.', true);
            elemek.lemondas.disabled = false;
            elemek.lemondas.textContent = elemek.lemondas.dataset.felirat || 'Foglalás lemondása';
            return;
        }
        elemek.lemondasMegjegyzes.value = '';
        await foglalasStatuszLekerdezese(kod, elemek);
        foglalasKezeloUzenet(elemek.statusz, valasz.message || 'A foglalást sikeresen lemondtad.');
    }

    function foglalasKezeloUzenet(elem, szoveg, hiba = false) {
        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }

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
