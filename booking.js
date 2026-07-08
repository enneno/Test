(function () {
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!document.body || document.body.dataset.bookingMode !== 'supabase') {
        return;
    }

    const allapot = {
        kliens: null,
        szolgaltatasok: []
    };

    document.addEventListener('DOMContentLoaded', () => {
        const elemek = urlapElemek();

        if (!elemek.urlap) {
            return;
        }

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
        elemek.datum.addEventListener('change', () => idopontokBetoltese(elemek));

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
            statusz: document.getElementById('foglalas-status')
        };
    }

    async function szolgaltatasokBetoltese(elemek) {
        selectAllapot(elemek.szolgaltatas, 'Szolgáltatások betöltése...');
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
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
        }
    }

    async function szabadDatumokBetoltese(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;

        selectAllapot(elemek.ido, 'Előbb válassz dátumot...');

        if (!szolgaltatasId) {
            selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
            return;
        }

        selectAllapot(elemek.datum, 'Szabad dátumok betöltése...');
        statuszKiirasa(elemek.statusz, '');

        const { data, error } = await allapot.kliens.rpc('get_available_dates', {
            p_service_id: szolgaltatasId,
            p_start_date: maiDatum(),
            p_days: 90
        });

        if (error) {
            statuszKiirasa(elemek.statusz, 'Most nem sikerült lekérni a szabad dátumokat. Futtasd a legfrissebb Supabase SQL-t, majd próbáld újra.', true);
            selectAllapot(elemek.datum, 'A szabad dátumok nem érhetők el');
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
        }
    }

    async function idopontokBetoltese(elemek) {
        const szolgaltatasId = elemek.szolgaltatas.value;
        const datum = elemek.datum.value;

        if (!szolgaltatasId || !datum) {
            selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
            return;
        }

        if (datum < maiDatum()) {
            selectAllapot(elemek.ido, 'Múltbeli dátum nem választható');
            return;
        }

        selectAllapot(elemek.ido, 'Szabad időpontok betöltése...');
        statuszKiirasa(elemek.statusz, '');

        const { data, error } = await allapot.kliens.rpc('get_available_slots', {
            p_service_id: szolgaltatasId,
            p_date: datum
        });

        if (error) {
            statuszKiirasa(elemek.statusz, 'Most nem sikerült lekérni a szabad időpontokat. Kérlek próbáld újra kicsit később.', true);
            selectAllapot(elemek.ido, 'Nem sikerült betölteni');
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
        }
    }

    async function foglalasKuldes(elemek) {
        const adatok = foglalasAdatok(elemek);
        const hiba = foglalasHiba(adatok);

        if (hiba) {
            statuszKiirasa(elemek.statusz, hiba, true);
            return;
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

        const emailEredmeny = eredmeny.email || { ok: false, error: 'missing_email_result' };
        naptarLinkFrissitese(adatok);
        sikeresPopupNyitasa(emailEredmeny);
        elemek.urlap.reset();
        selectAllapot(elemek.datum, 'Előbb válassz szolgáltatást...');
        selectAllapot(elemek.ido, 'Előbb válassz szolgáltatást és dátumot...');
        statuszKiirasa(elemek.statusz, emailEredmeny.ok
            ? 'A foglalás elküldve. A visszaigazoló emailt is elküldtük. Kérlek ellenőrizd a spam vagy promóciók mappát is.'
            : 'A foglalás elküldve. Az email értesítés most nem biztos, hogy elment, de a foglalás bekerült.');
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

    function foglalasAdatok(elemek) {
        return {
            nev: elemek.nev.value.trim(),
            telefon: `+36 ${elemzesTelefon(elemek.telefon.value)}`,
            telefonSzamok: elemzesTelefon(elemek.telefon.value),
            email: elemek.email.value.trim().toLowerCase(),
            szolgaltatasId: elemek.szolgaltatas.value,
            szolgaltatas: allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === elemek.szolgaltatas.value),
            datum: elemek.datum.value,
            startsAt: elemek.ido.value,
            megjegyzes: elemek.komment.value.trim()
        };
    }

    function foglalasHiba(adatok) {
        if (!adatok.nev || !adatok.telefonSzamok || !adatok.email || !adatok.szolgaltatasId || !adatok.datum || !adatok.startsAt) {
            return 'Kérlek tölts ki minden kötelező mezőt.';
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

        return '';
    }

    function szolgaltatasFelirat(szolgaltatas) {
        const reszek = [szolgaltatas.description?.trim() || szolgaltatas.name];

        if (szolgaltatas.price_text) {
            reszek.push(szolgaltatas.price_text);
        }

        if (szolgaltatas.duration_minutes > 0) {
            reszek.push(idoFelirat(szolgaltatas.duration_minutes));
        }

        return reszek.join(' - ');
    }

    function idoFelirat(percOsszesen) {
        const ora = Math.floor(percOsszesen / 60);
        const perc = percOsszesen % 60;
        const reszek = [];

        if (ora > 0) {
            reszek.push(`${ora} óra`);
        }

        if (perc > 0) {
            reszek.push(`${perc} perc`);
        }

        return reszek.join(' ') || '0 perc';
    }

    function elemzesTelefon(ertek) {
        let szamok = String(ertek || '').replace(/\D/g, '');

        if (szamok.startsWith('36')) {
            szamok = szamok.substring(2);
        } else if (szamok.startsWith('06')) {
            szamok = szamok.substring(2);
        }

        while (szamok.startsWith('0')) {
            szamok = szamok.substring(1);
        }

        return szamok.substring(0, 9);
    }

    function selectAllapot(select, szoveg) {
        select.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.selected = true;
        option.textContent = szoveg;
        select.appendChild(option);
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
        if (!elem) {
            return;
        }

        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }

    function mezokTiltasa(elemek, tiltva) {
        [elemek.nev, elemek.telefon, elemek.email, elemek.szolgaltatas, elemek.datum, elemek.ido, elemek.komment, elemek.kuldes]
            .filter(Boolean)
            .forEach(elem => {
                elem.disabled = tiltva;
            });
    }

    function gombAllapot(gomb, tiltva, szoveg) {
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

        if (popup) {
            popup.style.display = 'flex';
        }
    }
    function naptarLinkFrissitese(adatok) {
        const link = document.getElementById('naptar-link');

        if (!link || !adatok.startsAt || !adatok.szolgaltatas) {
            return;
        }

        const kezdes = new Date(adatok.startsAt);
        const idotartamPerc = adatok.szolgaltatas.duration_minutes > 0 ? adatok.szolgaltatas.duration_minutes : 30;
        const vege = new Date(kezdes.getTime() + idotartamPerc * 60000);
        const cim = `Lumi Nails - ${adatok.szolgaltatas.name}`;
        const leiras = `Foglalás: ${adatok.szolgaltatas.name}
Név: ${adatok.nev}
Telefon: ${adatok.telefon}`;
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

        if (link.dataset.url) {
            URL.revokeObjectURL(link.dataset.url);
        }

        const url = URL.createObjectURL(blob);
        link.href = url;
        link.dataset.url = url;
        link.download = 'lumi-nails-foglalas.ics';
        link.hidden = false;
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
        if (typeof error === 'string' && error.trim()) {
            return error.trim();
        }

        const uzenet = error?.message || '';

        if (uzenet) {
            return uzenet;
        }

        if (typeof error?.error === 'string' && error.error.trim()) {
            return error.error.trim();
        }

        return 'Most nem sikerült elküldeni a foglalást. Kérlek próbáld újra.';
    }

    function maiDatum() {
        const ma = new Date();
        const ev = ma.getFullYear();
        const honap = String(ma.getMonth() + 1).padStart(2, '0');
        const nap = String(ma.getDate()).padStart(2, '0');

        return `${ev}-${honap}-${nap}`;
    }
})();
