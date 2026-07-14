(function () {
    const ADMIN_EMAIL = 'luminails.xx@gmail.com';
    const FOGLALAS_OLDAL_MERET = 10;
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const allapot = {
        kliens: null,
        session: null,
        aktivTab: 'foglalasok',
        foglalasOldal: 1,
        foglalasElemek: [],
        esemenynaploElemek: [],
        naptarKijelolesek: new Map()
    };


    document.addEventListener('DOMContentLoaded', () => {
        const elemek = adminElemek();

        if (!elemek.loginForm || !elemek.tartalom) {
            return;
        }

        if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
            authStatusz(elemek, 'A Supabase kapcsolat nincs beállítva. Ellenőrizd a supabase-config.js fájlt.', true);
            return;
        }

        allapot.kliens = supabaseLib.createClient(config.url, config.publishableKey);

        elemek.loginForm.addEventListener('submit', event => {
            event.preventDefault();
            bejelentkezes(elemek);
        });

        elemek.kijelentkezes?.addEventListener('click', kijelentkezes);
        elemek.jelszoValtasGomb?.addEventListener('click', () => {
            elemek.jelszoForm.hidden = !elemek.jelszoForm.hidden;
            jelszoStatusz('');
        });
        elemek.jelszoForm?.addEventListener('submit', event => {
            event.preventDefault();
            jelszoModositasa();
        });
        elemek.foglalasFrissites?.addEventListener('click', foglalasokBetoltese);
        elemek.esemenynaploFrissites?.addEventListener('click', esemenynaploBetoltese);
        elemek.szolgaltatasHozzaadas?.addEventListener('click', szolgaltatasHozzaadas);
        elemek.lebegoMentes?.addEventListener('click', lebegoMentes);
        idosavAlapertelmezes(elemek);
        idosavNaptarInicializalasa(elemek);
        elemek.tiltasForm?.addEventListener('submit', event => {
            event.preventDefault();
        });

        document.querySelectorAll('.admin-tab').forEach(gomb => {
            gomb.addEventListener('click', () => adminTabValtas(gomb.dataset.adminTab));
        });

        elemek.foglalasLista?.addEventListener('click', foglalasListaKattintas);
        elemek.foglalasLapozo?.addEventListener('click', foglalasLapozoKattintas);
        elemek.szolgaltatasLista?.addEventListener('click', szolgaltatasListaKattintas);
        elemek.idosavLista?.addEventListener('click', idosavListaKattintas);
        elemek.idosavOsszesTorles?.addEventListener('click', idosavokOsszesTorlese);
        elemek.idosavLepesOsszes?.addEventListener('click', idosavLepesOsszesAlkalmazasa);
        elemek.tiltasLista?.addEventListener('click', tiltasListaKattintas);

        allapot.kliens.auth.onAuthStateChange((_event, session) => {
            sessionAllapot(session, elemek);
        });

        allapot.kliens.auth.getSession().then(({ data }) => {
            sessionAllapot(data.session, elemek);
        });
    });

    function adminElemek() {
        return {
            authPanel: document.getElementById('admin-bejelentkezes-panel'),
            loginForm: document.getElementById('admin-login-form'),
            email: document.getElementById('admin-email'),
            jelszo: document.getElementById('admin-jelszo'),
            authStatusz: document.getElementById('admin-auth-status'),
            tartalom: document.getElementById('admin-tartalom'),
            kijelentkezes: document.getElementById('admin-kijelentkezes'),
            jelszoValtasGomb: document.getElementById('admin-jelszo-valtas-gomb'),
            jelszoForm: document.getElementById('admin-jelszo-form'),
            ujJelszo: document.getElementById('admin-uj-jelszo'),
            ujJelszoIsmet: document.getElementById('admin-uj-jelszo-ismet'),
            jelszoStatusz: document.getElementById('admin-jelszo-status'),
            lebegoMentes: document.getElementById('admin-lebego-mentes'),
            onlineStatusz: document.getElementById('admin-online-status'),
            foglalasLista: document.getElementById('admin-foglalas-lista'),
            foglalasLapozo: document.getElementById('admin-foglalas-lapozo'),
            foglalasFrissites: document.getElementById('admin-foglalas-frissites'),
            esemenynaploLista: document.getElementById('admin-esemenynaplo-lista'),
            esemenynaploFrissites: document.getElementById('admin-esemenynaplo-frissites'),
            szolgaltatasLista: document.getElementById('admin-szolgaltatas-lista'),
            szolgaltatasHozzaadas: document.getElementById('admin-szolgaltatas-hozzaadas'),
            idosavLista: document.getElementById('admin-idosav-lista'),
            idosavOsszesTorles: document.getElementById('admin-idosav-osszes-torles'),
            idosavLepesOsszes: document.getElementById('admin-idosav-lepes-osszes'),
            naptarHonap: document.getElementById('admin-naptar-honap'),
            naptarRacs: document.getElementById('admin-naptar-racs'),
            naptarElozo: document.getElementById('admin-naptar-elozo'),
            naptarKovetkezo: document.getElementById('admin-naptar-kovetkezo'),
            naptarKozosKezdes: document.getElementById('admin-naptar-kozos-kezdes'),
            naptarKozosVege: document.getElementById('admin-naptar-kozos-vege'),
            naptarKozosLepes: document.getElementById('admin-naptar-kozos-lepes'),
            naptarKozosAlkalmazas: document.getElementById('admin-naptar-kozos-alkalmazas'),
            naptarKijelolesTorles: document.getElementById('admin-naptar-kijeloles-torles'),
            naptarKijeloltLista: document.getElementById('admin-naptar-kijelolt-lista'),
            naptarStatusz: document.getElementById('admin-naptar-status'),
            tiltasForm: document.getElementById('admin-tiltas-form'),
            tiltasDatum: document.getElementById('admin-tiltas-datum'),
            tiltasKezdes: document.getElementById('admin-tiltas-kezdes'),
            tiltasVege: document.getElementById('admin-tiltas-vege'),
            tiltasOk: document.getElementById('admin-tiltas-ok'),
            tiltasLista: document.getElementById('admin-tiltas-lista'),
            telefonLathato: document.getElementById('admin-telefon-lathato')
        };
    }

    function idosavAlapertelmezes(elemek) {
        if (!elemek.naptarHonap) {
            return;
        }

        if (elemek.naptarHonap && !elemek.naptarHonap.value) {
            elemek.naptarHonap.value = maiHonap();
        }

        if (elemek.naptarKozosKezdes && !elemek.naptarKozosKezdes.value) {
            elemek.naptarKozosKezdes.value = '09:00';
        }

        if (elemek.naptarKozosVege && !elemek.naptarKozosVege.value) {
            elemek.naptarKozosVege.value = '18:00';
        }

        if (elemek.naptarKozosLepes && !elemek.naptarKozosLepes.value) {
            elemek.naptarKozosLepes.value = '30';
        }

        if (elemek.tiltasDatum && !elemek.tiltasDatum.value) {
            elemek.tiltasDatum.value = maiDatum();
        }

        if (elemek.tiltasKezdes && !elemek.tiltasKezdes.value) {
            elemek.tiltasKezdes.value = '09:00';
        }

        if (elemek.tiltasVege && !elemek.tiltasVege.value) {
            elemek.tiltasVege.value = '10:00';
        }
    }

    function idosavNaptarInicializalasa(elemek) {
        if (!elemek.naptarHonap || !elemek.naptarRacs) {
            return;
        }

        elemek.naptarHonap.addEventListener('change', idosavNaptarRenderelese);
        elemek.naptarElozo?.addEventListener('click', () => naptarHonapLepes(-1));
        elemek.naptarKovetkezo?.addEventListener('click', () => naptarHonapLepes(1));
        elemek.naptarRacs.addEventListener('touchend', naptarNapErintes, { passive: false });
        elemek.naptarRacs.addEventListener('click', naptarNapKattintas);
        elemek.naptarKijeloltLista?.addEventListener('input', naptarSorValtozas);
        elemek.naptarKijeloltLista?.addEventListener('click', naptarListaKattintas);
        elemek.naptarKozosAlkalmazas?.addEventListener('click', naptarKozosIdoAlkalmazasa);
        elemek.naptarKijelolesTorles?.addEventListener('click', () => {
            allapot.naptarKijelolesek.clear();
            idosavNaptarRenderelese();
            naptarKijeloltListaRenderelese();
        });
        idosavNaptarRenderelese();
        naptarKijeloltListaRenderelese();
    }

    function idosavNaptarRenderelese() {
        const elemek = adminElemek();

        if (!elemek.naptarRacs || !elemek.naptarHonap.value) {
            return;
        }

        const [ev, honap] = elemek.naptarHonap.value.split('-').map(Number);
        const elsoNap = new Date(ev, honap - 1, 1, 12, 0, 0);
        const napokSzama = new Date(ev, honap, 0, 12, 0, 0).getDate();
        const elsoIsoNap = isoHetNapja(datumSzoveg(elsoNap));

        elemek.naptarRacs.innerHTML = '';

        for (let i = 1; i < elsoIsoNap; i += 1) {
            const ures = document.createElement('span');
            ures.className = 'admin-naptar-ures';
            elemek.naptarRacs.appendChild(ures);
        }

        for (let nap = 1; nap <= napokSzama; nap += 1) {
            const datum = datumSzoveg(new Date(ev, honap - 1, nap, 12, 0, 0));
            const gomb = document.createElement('button');
            gomb.type = 'button';
            gomb.className = 'admin-naptar-nap';
            gomb.dataset.datum = datum;
            gomb.textContent = String(nap);
            gomb.classList.toggle('kijelolt', allapot.naptarKijelolesek.has(datum));
            elemek.naptarRacs.appendChild(gomb);
        }
    }

    function naptarNapKattintas(event) {
        const gomb = event.target.closest('.admin-naptar-nap');

        if (!gomb) {
            return;
        }

        naptarNapValtasa(gomb);
    }

    function naptarNapErintes(event) {
        const gomb = event.target.closest('.admin-naptar-nap');

        if (!gomb) {
            return;
        }

        event.preventDefault();
        naptarNapValtasa(gomb);
    }

    function naptarNapValtasa(gomb) {
        const datum = gomb.dataset.datum;

        if (allapot.naptarKijelolesek.has(datum)) {
            allapot.naptarKijelolesek.delete(datum);
        } else {
            allapot.naptarKijelolesek.set(datum, naptarAlapIdosav());
        }

        gomb.classList.toggle('kijelolt', allapot.naptarKijelolesek.has(datum));
        naptarKijeloltListaRenderelese();
    }

    function naptarKijeloltListaRenderelese() {
        const elemek = adminElemek();

        if (!elemek.naptarKijeloltLista) {
            return;
        }

        elemek.naptarKijeloltLista.innerHTML = '';

        const datumok = Array.from(allapot.naptarKijelolesek.keys()).sort();

        if (datumok.length === 0) {
            elemek.naptarKijeloltLista.innerHTML = '<p class="admin-ures">Válassz napokat a naptárból.</p>';
            return;
        }

        datumok.forEach(datum => {
            const ertek = allapot.naptarKijelolesek.get(datum) || naptarAlapIdosav();
            const sor = document.createElement('div');
            sor.className = 'admin-naptar-sor';
            sor.dataset.datum = datum;
            sor.innerHTML = `
                <div class="admin-naptar-datum">${html(datumRovid(datum))}</div>
                <label class="admin-mezo">Kezdés<input type="time" data-naptar-mezo="start_time" value="${attr(ertek.start_time)}"></label>
                <label class="admin-mezo">Vége<input type="time" data-naptar-mezo="end_time" value="${attr(ertek.end_time)}"></label>
                <button type="button" class="admin-kis-gomb admin-naptar-torles-x" data-naptar-torles aria-label="Törlés">×</button>
            `;
            elemek.naptarKijeloltLista.appendChild(sor);
        });
    }

    function naptarSorValtozas(event) {
        const sor = event.target.closest('.admin-naptar-sor');

        if (!sor) {
            return;
        }

        naptarSorMenteseMemoriaba(sor);
    }

    function naptarListaKattintas(event) {
        const torlesGomb = event.target.closest('[data-naptar-torles]');

        if (!torlesGomb) {
            return;
        }

        const sor = torlesGomb.closest('.admin-naptar-sor');
        allapot.naptarKijelolesek.delete(sor.dataset.datum);
        const naptarGomb = document.querySelector(`.admin-naptar-nap[data-datum="${sor.dataset.datum}"]`);

        if (naptarGomb) {
            naptarGomb.classList.remove('kijelolt');
        }

        naptarKijeloltListaRenderelese();
    }

    function naptarKozosIdoAlkalmazasa() {
        const elemek = adminElemek();

        if (elemek.naptarKozosVege.value <= elemek.naptarKozosKezdes.value) {
            onlineStatusz('A közös végidő legyen később, mint a kezdés.', true);
            naptarStatusz('A közös végidő legyen később, mint a kezdés.', true);
            return;
        }

        allapot.naptarKijelolesek.forEach((_ertek, datum) => {
            allapot.naptarKijelolesek.set(datum, naptarAlapIdosav());
        });

        naptarKijeloltListaRenderelese();
        onlineStatusz('A közös idő beállítva a kijelölt napokra.');
        naptarStatusz('A közös idő beállítva a kijelölt napokra.');
    }

    async function naptarKijeloltNapokMentese() {
        const elemek = adminElemek();
        const sorok = Array.from(elemek.naptarKijeloltLista.querySelectorAll('.admin-naptar-sor'));

        if (sorok.length === 0) {
            onlineStatusz('Előbb válassz ki napokat a naptárból.', true);
            naptarStatusz('Előbb válassz ki napokat a naptárból.', true);
            return;
        }

        sorok.forEach(naptarSorMenteseMemoriaba);

        const savok = Array.from(allapot.naptarKijelolesek, ([datum, ertek]) => ({
            work_date: datum,
            start_time: ertek.start_time,
            end_time: ertek.end_time,
            slot_step_minutes: naptarKozosLepesErtek(),
            active: true
        }));

        const hibasSav = savok.find(sav => sav.end_time <= sav.start_time);

        if (hibasSav) {
            onlineStatusz(`${hibasSav.work_date}: a végidő legyen később, mint a kezdés.`, true);
            naptarStatusz(`${hibasSav.work_date}: a végidő legyen később, mint a kezdés.`, true);
            return;
        }

        onlineStatusz(`${savok.length} nap mentése...`);
        naptarStatusz(`${savok.length} nap mentése...`);

        const { error } = await allapot.kliens
            .from('availability_windows')
            .upsert(savok, { onConflict: 'work_date,start_time,end_time' });

        if (error) {
            onlineStatusz('Nem sikerült menteni a kijelölt napokat. Futtasd a dátumos Supabase migrációt, majd próbáld újra.', true);
            naptarStatusz(`Nem sikerült menteni. Valószínűleg a Supabase dátumos migráció hiányzik vagy hibás. Részlet: ${error.message}`, true);
            return;
        }

        onlineStatusz(`${savok.length} nap mentve.`);
        naptarStatusz(`${savok.length} nap mentve. Lent a meglévő dátumok listájában is meg kell jelennie.`);
        idosavokBetoltese();
    }

    function naptarSorMenteseMemoriaba(sor) {
        allapot.naptarKijelolesek.set(sor.dataset.datum, {
            start_time: sor.querySelector('[data-naptar-mezo="start_time"]').value,
            end_time: sor.querySelector('[data-naptar-mezo="end_time"]').value,
            slot_step_minutes: naptarKozosLepesErtek()
        });
    }

    function naptarAlapIdosav() {
        const elemek = adminElemek();

        return {
            start_time: elemek.naptarKozosKezdes?.value || '09:00',
            end_time: elemek.naptarKozosVege?.value || '18:00',
            slot_step_minutes: naptarKozosLepesErtek()
        };
    }

    function naptarKozosLepesErtek() {
        const elemek = adminElemek();
        const ertek = Number.parseInt(elemek.naptarKozosLepes?.value, 10);

        return Number.isFinite(ertek) && ertek > 0 ? ertek : 30;
    }

    function naptarHonapLepes(irany) {
        const elemek = adminElemek();
        const [ev, honap] = elemek.naptarHonap.value.split('-').map(Number);
        const datum = new Date(ev, honap - 1 + irany, 1, 12, 0, 0);
        elemek.naptarHonap.value = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`;
        idosavNaptarRenderelese();
    }

    function datumRovid(datumSzovegErtek) {
        const [ev, honap, nap] = String(datumSzovegErtek || '').split('-');
        return ev && honap && nap ? `${nap}.${honap}.${String(ev).slice(-2)}` : String(datumSzovegErtek || '');
    }

    function datumFelirat(datumSzovegErtek) {
        return new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'long'
        }).format(datumObjektum(datumSzovegErtek));
    }

    async function bejelentkezes(elemek) {
        const email = adminEmail(elemek);

        authStatusz(elemek, 'Belépés...');

        const { error } = await allapot.kliens.auth.signInWithPassword({
            email,
            password: elemek.jelszo.value
        });

        if (error) {
            console.error('Admin belépési hiba:', error);
            authStatusz(elemek, `Nem sikerült belépni ezzel az emaillel: ${email}. Ellenőrizd a jelszót.`, true);
        }
    }

    function adminEmail(elemek) {
        return (elemek.email?.value || ADMIN_EMAIL).trim().toLowerCase();
    }

    async function kijelentkezes() {
        await allapot.kliens.auth.signOut();
    }

    async function jelszoModositasa() {
        const elemek = adminElemek();
        const ujJelszo = elemek.ujJelszo.value;
        const ujJelszoIsmet = elemek.ujJelszoIsmet.value;

        if (!ujJelszo || !ujJelszoIsmet) {
            jelszoStatusz('Add meg kétszer az új jelszót.', true);
            return;
        }

        if (ujJelszo.length < 8) {
            jelszoStatusz('A jelszó legyen legalább 8 karakter hosszú.', true);
            return;
        }

        if (ujJelszo !== ujJelszoIsmet) {
            jelszoStatusz('A két jelszó nem egyezik.', true);
            return;
        }

        jelszoStatusz('Jelszó mentése...');

        const { error } = await allapot.kliens.auth.updateUser({
            password: ujJelszo
        });

        if (error) {
            jelszoStatusz('Nem sikerült módosítani a jelszót. Lépj be újra, majd próbáld meg ismét.', true);
            return;
        }

        elemek.jelszoForm.reset();
        elemek.jelszoForm.hidden = true;
        jelszoStatusz('Jelszó módosítva.');
    }

    function sessionAllapot(session, elemek) {
        allapot.session = session;
        elemek.authPanel.hidden = Boolean(session);
        elemek.tartalom.hidden = !session;
        if (elemek.lebegoMentes) {
            elemek.lebegoMentes.hidden = !session;
        }

        if (session) {
            authStatusz(elemek, '');
            adatokFrissitese();
        }
    }

    function adatokFrissitese() {
        foglalasokBetoltese();
        esemenynaploBetoltese();
        szolgaltatasokBetoltese();
        idosavokBetoltese();
        tiltasokBetoltese();
        beallitasokBetoltese();
    }

    async function lebegoMentes() {
        const elemek = adminElemek();
        const tab = allapot.aktivTab;

        if (tab === 'foglalasok') {
            await foglalasStatuszokMentese();
            return;
        }

        if (tab === 'szolgaltatasok') {
            await szolgaltatasokMentese();
            return;
        }

        if (tab === 'idosavok') {
            await idosavokEsNaptarMentese();
            return;
        }

        if (tab === 'tiltasok') {
            await tiltasHozzaadas();
            return;
        }

        if (tab === 'esemenynaplo') {
            await esemenynaploBetoltese();
            return;
        }

        if (tab === 'beallitasok') {
            await beallitasokMentese();
            return;
        }

        if (tab === 'szovegek') {
            return;
        }

        onlineStatusz('Nincs menthető módosítás ezen a nézeten.');
    }

    async function idosavokEsNaptarMentese() {
        const mentendoNaptarNapok = allapot.naptarKijelolesek.size > 0;

        if (mentendoNaptarNapok) {
            await naptarKijeloltNapokMentese();
        }

        await idosavokMentese();
    }

    async function foglalasokBetoltese() {
        const elemek = adminElemek();
        onlineStatusz('Foglalások betöltése...');

        const alapSelect = 'id,customer_name,customer_phone,customer_email,note,starts_at,ends_at,status,created_at,services(name,price_text)';
        const inspiracioSelect = 'id,customer_name,customer_phone,customer_email,note,starts_at,ends_at,status,created_at,inspiration_image_url,inspiration_image_path,inspiration_image_name,inspiration_image_type,inspiration_image_size,inspiration_images,nail_style,nail_style_note,services(name,price_text)';
        let { data: foglalasok, error: foglalasHiba } = await allapot.kliens
            .from('bookings')
            .select(inspiracioSelect)
            .order('starts_at', { ascending: false })
            .limit(120);

        if (foglalasHiba && hianyzoInspiracioOszlop(foglalasHiba)) {
            ({ data: foglalasok, error: foglalasHiba } = await allapot.kliens
                .from('bookings')
                .select(alapSelect)
                .order('starts_at', { ascending: false })
                .limit(120));
        }

        const { data: tiltasok, error: tiltasHiba } = await allapot.kliens
            .from('blocked_times')
            .select('id,starts_at,ends_at,reason,created_at')
            .order('starts_at', { ascending: false })
            .limit(120);

        if (foglalasHiba || tiltasHiba) {
            onlineStatusz('Nem sikerült betölteni a foglalásokat.', true);
            return;
        }

        allapot.foglalasElemek = [
            ...(foglalasok || []).map(foglalas => ({ tipus: 'booking', datum: foglalas.starts_at, adat: foglalas })),
            ...(tiltasok || []).map(tiltas => ({ tipus: 'blocked', datum: tiltas.starts_at, adat: tiltas }))
        ].sort((a, b) => new Date(b.datum) - new Date(a.datum));

        if (allapot.foglalasOldal > foglalasOsszesOldal()) {
            allapot.foglalasOldal = foglalasOsszesOldal();
        }

        foglalasListaRenderelese();
        onlineStatusz('');
    }

    function hianyzoInspiracioOszlop(error) {
        const uzenet = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return uzenet.includes('inspiration_image') || uzenet.includes('nail_style') || uzenet.includes('column') && uzenet.includes('schema cache');
    }
    function foglalasListaRenderelese() {
        const elemek = adminElemek();
        const kezd = (allapot.foglalasOldal - 1) * FOGLALAS_OLDAL_MERET;
        const oldalElemek = allapot.foglalasElemek.slice(kezd, kezd + FOGLALAS_OLDAL_MERET);

        elemek.foglalasLista.innerHTML = '';

        if (!oldalElemek.length) {
            elemek.foglalasLista.innerHTML = '<p class="admin-ures">Még nincs foglalás vagy kézzel felvett foglalt idő.</p>';
            foglalasLapozoRenderelese();
            return;
        }

        oldalElemek.forEach(elem => {
            elemek.foglalasLista.appendChild(elem.tipus === 'blocked'
                ? tiltasFoglalasKartya(elem.adat)
                : foglalasKartya(elem.adat));
        });

        foglalasLapozoRenderelese();
    }

    function foglalasOsszesOldal() {
        return Math.max(1, Math.ceil(allapot.foglalasElemek.length / FOGLALAS_OLDAL_MERET));
    }

    function foglalasLapozoRenderelese() {
        const elemek = adminElemek();

        if (!elemek.foglalasLapozo) {
            return;
        }

        const osszes = foglalasOsszesOldal();

        if (osszes <= 1) {
            elemek.foglalasLapozo.innerHTML = '';
            return;
        }

        elemek.foglalasLapozo.innerHTML = `
            <button type="button" class="admin-kis-gomb" data-foglalas-oldal="elozo" ${allapot.foglalasOldal <= 1 ? 'disabled' : ''}>Előző</button>
            <span>${allapot.foglalasOldal} / ${osszes}</span>
            <button type="button" class="admin-kis-gomb" data-foglalas-oldal="kovetkezo" ${allapot.foglalasOldal >= osszes ? 'disabled' : ''}>Következő</button>
        `;
    }

    function foglalasLapozoKattintas(event) {
        const gomb = event.target.closest('[data-foglalas-oldal]');

        if (!gomb) {
            return;
        }

        allapot.foglalasOldal += gomb.dataset.foglalasOldal === 'kovetkezo' ? 1 : -1;
        allapot.foglalasOldal = Math.min(Math.max(allapot.foglalasOldal, 1), foglalasOsszesOldal());
        foglalasListaRenderelese();
    }

    async function esemenynaploBetoltese() {
        const elemek = adminElemek();

        if (!elemek.esemenynaploLista) {
            return;
        }

        elemek.esemenynaploLista.innerHTML = '<p class="admin-ures">Eseménynapló betöltése...</p>';

        const { data, error } = await allapot.kliens
            .from('booking_events')
            .select('id,booking_id,event_type,channel,status,title,message,metadata,created_at,bookings(customer_name,starts_at)')
            .order('created_at', { ascending: false })
            .limit(80);

        if (error) {
            elemek.esemenynaploLista.innerHTML = '<p class="admin-ures">Az eseménynapló még nem érhető el. Futtasd a booking_events SQL-t Supabase-ben.</p>';
            return;
        }

        allapot.esemenynaploElemek = Array.isArray(data) ? data : [];
        esemenynaploRenderelese();
    }

    function esemenynaploRenderelese() {
        const elemek = adminElemek();

        if (!elemek.esemenynaploLista) {
            return;
        }

        elemek.esemenynaploLista.innerHTML = '';

        if (!allapot.esemenynaploElemek.length) {
            elemek.esemenynaploLista.innerHTML = '<p class="admin-ures">Még nincs naplózott foglalási esemény.</p>';
            return;
        }

        allapot.esemenynaploElemek.forEach(esemeny => {
            const kartya = document.createElement('article');
            kartya.className = `admin-db-kartya admin-esemeny-kartya admin-esemeny-${html(esemeny.status || 'info')}`;
            const foglalasNev = esemeny.bookings?.customer_name || '';
            const foglalasIdo = esemeny.bookings?.starts_at ? datumIdo(esemeny.bookings.starts_at) : '';

            kartya.innerHTML = `
                <div class="admin-db-kartya-fej">
                    <div>
                        <p class="admin-esemeny-idopont">${html(datumIdo(esemeny.created_at))}</p>
                        <h3>${html(esemeny.title || esemenyTipusFelirat(esemeny.event_type))}</h3>
                    </div>
                    <span class="admin-esemeny-statusz">${html(esemenyStatuszFelirat(esemeny.status))}</span>
                </div>
                <div class="admin-esemeny-reszletek">
                    ${foglalasNev ? `<p><strong>Foglalás:</strong> ${html(foglalasNev)}${foglalasIdo ? ` - ${html(foglalasIdo)}` : ''}</p>` : ''}
                    ${esemeny.message ? `<p>${html(esemeny.message)}</p>` : ''}
                    <p class="admin-esemeny-meta">${html([esemeny.channel, esemeny.event_type].filter(Boolean).join(' / '))}</p>
                </div>
            `;

            elemek.esemenynaploLista.appendChild(kartya);
        });
    }

    function esemenyStatuszFelirat(statusz) {
        return {
            success: 'Sikeres',
            warning: 'Figyelmeztetés',
            error: 'Hiba',
            info: 'Infó'
        }[statusz] || 'Infó';
    }

    function esemenyTipusFelirat(tipus) {
        return {
            booking_created: 'Foglalás rögzítve',
            owner_email: 'Tulaj email',
            customer_email: 'Vendég email',
            email_flow_failed: 'Email folyamat hiba',
            admin_update_email: 'Módosítás email'
        }[tipus] || 'Esemény';
    }

    function foglalasKartya(foglalas) {
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya';
        kartya.dataset.id = foglalas.id;
        kartya.dataset.tipus = 'booking';
        kartya.dataset.eredetiStatusz = foglalas.status || '';
        kartya.dataset.eredetiDatum = datumInputErtek(foglalas.starts_at);
        kartya.dataset.eredetiKezdes = idoInputErtek(foglalas.starts_at);
        kartya.dataset.eredetiVege = idoInputErtek(foglalas.ends_at);
        const inspiracioKepek = foglalasInspiracioKepek(foglalas);
        kartya.dataset.inspiracioKepek = JSON.stringify(inspiracioKepek);

        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div class="admin-foglalas-fosor">
                    <h3>${html(foglalas.customer_name)}</h3>
                    <p class="admin-foglalas-idopont">${html(datumIdoRovid(foglalas.starts_at))} - ${html(datumIdoRovid(foglalas.ends_at, true))}</p>
                </div>
                <div class="admin-foglalas-vezerlok">
                    <select class="admin-db-statusz" data-foglalas-statusz disabled>
                        ${statuszOption('pending', 'Függőben', foglalas.status)}
                        ${statuszOption('confirmed', 'Visszaigazolva', foglalas.status)}
                        ${statuszOption('done', 'Kész', foglalas.status)}
                        ${statuszOption('cancelled', 'Lemondva', foglalas.status)}
                    </select>
                    <button type="button" class="admin-kis-gomb" data-foglalas-szerkesztes>Szerkesztés</button>
                </div>
            </div>
            <div class="admin-foglalas-reszletek admin-foglalas-reszletek-kompakt">
                <div class="admin-foglalas-meta-grid">
                    <p><strong>Szolgáltatás</strong><span>${html(foglalas.services?.name || 'Törölt szolgáltatás')}</span></p>
                    <p><strong>Leadva</strong><span>${html(datumIdoRovid(foglalas.created_at))}</span></p>
                    <p><strong>Tel</strong><a href="tel:${html(foglalas.customer_phone.replace(/\s/g, ''))}">${html(foglalas.customer_phone)}</a></p>
                    <p><strong>Email</strong><a href="mailto:${html(foglalas.customer_email)}">${html(foglalas.customer_email)}</a></p>
                </div>
                ${foglalas.note ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles"><strong>Megjegyzés:</strong> ${html(foglalas.note)}</p>` : ''}
                ${inspiracioKepek.length ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles"><strong>Inspiráció:</strong> <button type="button" class="admin-inspiracio-link" data-inspiracio-megnyitas>${inspiracioKepek.length} kép megnyitása</button></p>` : ''}
            </div>            <div class="admin-idopont-szerkeszto">
                <label class="admin-mezo">Dátum<input type="date" data-idopont-mezo="date" value="${attr(datumInputErtek(foglalas.starts_at))}" disabled></label>
                <label class="admin-mezo">Kezdés<input type="time" data-idopont-mezo="start_time" value="${attr(idoInputErtek(foglalas.starts_at))}" disabled></label>
                <label class="admin-mezo">Vége<input type="time" data-idopont-mezo="end_time" value="${attr(idoInputErtek(foglalas.ends_at))}" disabled></label>
                <label class="admin-mezo admin-mezo-szeles">Üzenet az emailhez<textarea data-idopont-mezo="admin_message" placeholder="Opcionális. Lemondásnál vagy időpontmódosításnál bekerül a vendég emailjébe." disabled></textarea></label>
            </div>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb" data-foglalas-torles>Eltávolítás</button>
            </div>
        `;

        return kartya;
    }

    function foglalasInspiracioKepek(foglalas) {
        const kepek = [];
        const ujKepek = Array.isArray(foglalas.inspiration_images) ? foglalas.inspiration_images : [];

        ujKepek.forEach(kep => {
            if (kep?.url) {
                kepek.push({
                    url: kep.url,
                    path: kep.path || '',
                    name: kep.name || 'Inspirációs kép'
                });
            }
        });

        if (!kepek.length && foglalas.inspiration_image_url) {
            kepek.push({
                url: foglalas.inspiration_image_url,
                path: foglalas.inspiration_image_path || '',
                name: foglalas.inspiration_image_name || 'Inspirációs kép'
            });
        }

        return kepek;
    }

    function inspiracioKepekKartyan(kartya) {
        try {
            const kepek = JSON.parse(kartya?.dataset.inspiracioKepek || '[]');
            return Array.isArray(kepek) ? kepek : [];
        } catch (_error) {
            return [];
        }
    }

    function inspiracioKepStoragePath(kep) {
        if (kep?.path) return kep.path;
        if (!kep?.url) return '';

        try {
            const url = new URL(kep.url, window.location.origin);
            const marker = '/storage/v1/object/public/site-media/';
            const index = url.pathname.indexOf(marker);
            if (index === -1) return '';
            return decodeURIComponent(url.pathname.slice(index + marker.length));
        } catch (_error) {
            return '';
        }
    }

    function inspiracioModalNyitasa(kartya) {
        const kepek = inspiracioKepekKartyan(kartya);
        if (!kepek.length) return;

        let modal = document.getElementById('admin-inspiracio-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'admin-inspiracio-modal';
            modal.className = 'admin-inspiracio-modal';
            document.body.appendChild(modal);
            modal.addEventListener('click', event => {
                if (event.target === modal || event.target.closest('[data-inspiracio-bezaras]')) {
                    inspiracioModalBezarasa();
                }
            });
        }

        modal.innerHTML = `
            <div class="admin-inspiracio-modal-doboz" role="dialog" aria-modal="true" aria-label="Inspirációs képek">
                <button type="button" class="admin-inspiracio-bezaras" data-inspiracio-bezaras aria-label="Bezárás">×</button>
                <h3>Inspirációs képek</h3>
                <div class="admin-inspiracio-modal-racs">
                    ${kepek.map(kep => `<figure><img src="${attr(kep.url)}" alt="${attr(kep.name || 'Inspirációs kép')}"><figcaption>${html(kep.name || 'Inspirációs kép')}</figcaption></figure>`).join('')}
                </div>
            </div>
        `;
        modal.hidden = false;
        document.body.classList.add('admin-modal-nyitva');
    }

    function inspiracioModalBezarasa() {
        const modal = document.getElementById('admin-inspiracio-modal');
        if (modal) modal.hidden = true;
        document.body.classList.remove('admin-modal-nyitva');
    }

    function tiltasFoglalasKartya(tiltas) {
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya admin-db-kartya-tiltas';
        kartya.dataset.id = tiltas.id;
        kartya.dataset.tipus = 'blocked';
        const megjegyzes = tiltas.reason?.trim() || 'Kézi foglalás';
        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div class="admin-foglalas-fosor">
                    <h3>${html(megjegyzes)}</h3>
                    <p class="admin-foglalas-idopont">${html(datumIdo(tiltas.starts_at))} - ${html(datumIdo(tiltas.ends_at, true))}</p>
                </div>
                <div class="admin-foglalas-vezerlok">
                    <span class="admin-db-statusz admin-db-statusz-fix">Foglalt</span>
                    <button type="button" class="admin-kis-gomb" data-foglalas-szerkesztes>Szerkesztés</button>
                </div>
            </div>
            <div class="admin-idopont-szerkeszto">
                <label class="admin-mezo">Dátum<input type="date" data-idopont-mezo="date" value="${attr(datumInputErtek(tiltas.starts_at))}" disabled></label>
                <label class="admin-mezo">Kezdés<input type="time" data-idopont-mezo="start_time" value="${attr(idoInputErtek(tiltas.starts_at))}" disabled></label>
                <label class="admin-mezo">Vége<input type="time" data-idopont-mezo="end_time" value="${attr(idoInputErtek(tiltas.ends_at))}" disabled></label>
                <label class="admin-mezo admin-mezo-szeles">Név / megjegyzés<input type="text" data-idopont-mezo="reason" value="${attr(megjegyzes)}" required disabled></label>
            </div>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb" data-foglalas-torles>Eltávolítás</button>
            </div>
        `;

        return kartya;
    }

    async function foglalasStatuszokMentese() {
        const kartyak = Array.from(document.querySelectorAll('#admin-foglalas-lista .admin-db-kartya'));

        if (!kartyak.length) {
            onlineStatusz('Nincs menthető foglalási bejegyzés ezen az oldalon.');
            return;
        }

        onlineStatusz('Foglalási módosítások mentése...');

        let emailKuldesek = 0;
        let emailHibak = 0;

        for (const kartya of kartyak) {
            const adatok = idopontModositasAdatok(kartya);

            if (adatok.hiba) {
                onlineStatusz(adatok.hiba, true);
                return;
            }

            const tabla = kartya.dataset.tipus === 'blocked' ? 'blocked_times' : 'bookings';
            const modositas = kartya.dataset.tipus === 'blocked'
                ? {
                    starts_at: adatok.startsAt,
                    ends_at: adatok.endsAt,
                    reason: idopontMezo(kartya, 'reason')?.value.trim()
                }
                : {
                    status: kartya.querySelector('[data-foglalas-statusz]').value,
                    starts_at: adatok.startsAt,
                    ends_at: adatok.endsAt
                };

            const utkozesHiba = await idopontUtkozesHiba(kartya, adatok.startsAt, adatok.endsAt, modositas.status);

            if (utkozesHiba) {
                onlineStatusz(utkozesHiba, true);
                return;
            }

            const { error } = await allapot.kliens
                .from(tabla)
                .update(modositas)
                .eq('id', kartya.dataset.id);

            if (error) {
                onlineStatusz(`Nem sikerült menteni az egyik bejegyzést. ${error.message || ''}`, true);
                return;
            }

            if (kartya.dataset.tipus === 'booking' && modositas.status === 'done') {
                await foglalasInspiraciokTorlese(kartya);
            }

            if (kartya.dataset.tipus === 'booking') {
                const emailModositas = foglalasEmailModositas(kartya, modositas);

                if (emailModositas) {
                    await foglalasEsemenyRogzitese(kartya.dataset.id, {
                        event_type: 'admin_booking_updated',
                        channel: 'admin',
                        status: 'info',
                        title: 'Admin módosítás mentve',
                        message: 'A foglalás adatai az admin felületen módosultak.',
                        metadata: emailModositas
                    });

                    const emailEredmeny = await foglalasModositasEmailKuldese(kartya.dataset.id, emailModositas);
                    emailKuldesek += 1;

                    if (!emailEredmeny.ok) {
                        emailHibak += 1;
                    }
                }
            }
        }

        if (emailHibak > 0) {
            onlineStatusz(`Foglalási módosítások mentve, de ${emailHibak} email értesítés nem ment ki.`, true);
        } else if (emailKuldesek > 0) {
            onlineStatusz(`Foglalási módosítások mentve, ${emailKuldesek} email értesítés elküldve.`);
        } else {
            onlineStatusz('Foglalási módosítások mentve. A szabad idősávok ehhez igazodnak.');
        }

        foglalasokBetoltese();
        esemenynaploBetoltese();
    }

    async function foglalasInspiraciokTorlese(kartya, opciok = {}) {
        const kepek = inspiracioKepekKartyan(kartya);
        const paths = Array.from(new Set(kepek.map(inspiracioKepStoragePath).filter(Boolean)));
        const mezokUritese = opciok.mezokUritese !== false;

        if (!kepek.length) return true;

        if (!paths.length) {
            console.warn('Inspirációs kép van a foglaláson, de nincs törölhető Storage path.');
            return false;
        }

        const { error: torlesHiba } = await allapot.kliens.storage
            .from('site-media')
            .remove(paths);

        if (torlesHiba) {
            console.warn('Inspirációs képek Storage törlése nem sikerült:', torlesHiba);
            return false;
        }

        if (!mezokUritese) {
            kartya.dataset.inspiracioKepek = '[]';
            kartya.querySelector('[data-inspiracio-megnyitas]')?.closest('p')?.remove();
            return true;
        }

        try {
            const { error } = await allapot.kliens.rpc('clear_booking_inspiration', {
                p_booking_id: kartya.dataset.id
            });

            if (error) {
                console.warn('Inspirációs képmezők ürítése nem sikerült:', error);
                return false;
            }

            kartya.dataset.inspiracioKepek = '[]';
            kartya.querySelector('[data-inspiracio-megnyitas]')?.closest('p')?.remove();
            return true;
        } catch (error) {
            console.warn('Inspirációs képtakarítás hiba:', error);
            return false;
        }
    }

    function foglalasEmailModositas(kartya, modositas) {
        const statuszValtozott = kartya.dataset.eredetiStatusz !== modositas.status;
        const idopontValtozott = kartya.dataset.eredetiDatum !== idopontMezo(kartya, 'date')?.value
            || kartya.dataset.eredetiKezdes !== idopontMezo(kartya, 'start_time')?.value
            || kartya.dataset.eredetiVege !== idopontMezo(kartya, 'end_time')?.value;

        if (!statuszValtozott && !idopontValtozott) {
            return null;
        }

        if (statuszValtozott && modositas.status === 'done' && !idopontValtozott) {
            return null;
        }

        return {
            status_changed: statuszValtozott,
            time_changed: idopontValtozott,
            status: modositas.status,
            message: idopontMezo(kartya, 'admin_message')?.value.trim() || ''
        };
    }

    async function foglalasEsemenyRogzitese(bookingId, esemeny) {
        if (!bookingId) {
            return;
        }

        const { error } = await allapot.kliens
            .from('booking_events')
            .insert({
                booking_id: bookingId,
                event_type: esemeny.event_type,
                channel: esemeny.channel || 'admin',
                status: esemeny.status || 'info',
                title: esemeny.title || 'Admin esemény',
                message: esemeny.message || '',
                metadata: esemeny.metadata || {}
            });

        if (error) {
            console.warn('Lumi Nails eseménynapló mentési hiba:', error);
        }
    }

    async function foglalasModositasEmailKuldese(bookingId, modositas) {
        if (!bookingId || !allapot.kliens.functions?.invoke) {
            return { ok: false, skipped: true };
        }

        try {
            const invokeOptions = {
                body: {
                    booking_id: bookingId,
                    mode: 'admin_update',
                    notification: modositas
                }
            };

            if (allapot.session?.access_token) {
                invokeOptions.headers = {
                    Authorization: `Bearer ${allapot.session.access_token}`
                };
            }

            const { data, error } = await allapot.kliens.functions.invoke('send-booking-update-email', invokeOptions);

            if (error) {
                console.warn('Lumi Nails módosítás email hiba:', error);
                return { ok: false, error };
            }

            return data || { ok: false };
        } catch (error) {
            console.warn('Lumi Nails módosítás email hiba:', error);
            return { ok: false, error };
        }
    }

    async function foglalasListaKattintas(event) {
        const inspiracio = event.target.closest('[data-inspiracio-megnyitas]');
        const szerkesztes = event.target.closest('[data-foglalas-szerkesztes]');
        const torles = event.target.closest('[data-foglalas-torles]');

        if (inspiracio) {
            inspiracioModalNyitasa(inspiracio.closest('.admin-db-kartya'));
            return;
        }

        if (szerkesztes) {
            foglalasSzerkesztesKapcsolasa(szerkesztes.closest('.admin-db-kartya'));
            return;
        }

        if (!torles) {
            return;
        }

        const kartya = torles.closest('.admin-db-kartya');
        const tabla = kartya?.dataset.tipus === 'blocked' ? 'blocked_times' : 'bookings';
        const id = kartya?.dataset.id;

        if (!id) {
            return;
        }

        if (!window.confirm('Biztosan eltávolítod ezt a foglalási bejegyzést?')) {
            return;
        }

        if (kartya?.dataset.tipus === 'booking') {
            const kepek = inspiracioKepekKartyan(kartya);
            if (kepek.length) {
                onlineStatusz('Foglaláshoz tartozó képek törlése...');
                const kepekTorolve = await foglalasInspiraciokTorlese(kartya, { mezokUritese: false });
                if (!kepekTorolve) {
                    onlineStatusz('A foglaláshoz tartozó kép törlése nem sikerült, ezért a foglalást nem töröltem. Kérlek próbáld újra, vagy ellenőrizd a Supabase Storage jogosultságot.', true);
                    return;
                }
            }
        }

        await rekordTorlese(tabla, id, foglalasokBetoltese);
    }

    function foglalasSzerkesztesKapcsolasa(kartya) {
        if (!kartya) {
            return;
        }

        const aktiv = !kartya.classList.contains('szerkeszt');
        kartya.classList.toggle('szerkeszt', aktiv);

        kartya.querySelectorAll('[data-idopont-mezo], [data-foglalas-statusz]').forEach(mezoElem => {
            mezoElem.disabled = !aktiv;
        });

        const gomb = kartya.querySelector('[data-foglalas-szerkesztes]');

        if (gomb) {
            gomb.textContent = aktiv ? 'Bezárás' : 'Szerkesztés';
        }
    }

    async function szolgaltatasokBetoltese() {
        const elemek = adminElemek();
        const { data, error } = await allapot.kliens
            .from('services')
            .select('id,name,description,price_text,duration_minutes,booking_enabled,active,sort_order')
            .order('sort_order', { ascending: true });

        if (error) {
            onlineStatusz('Nem sikerült betölteni az árlista tételeket.', true);
            return;
        }

        elemek.szolgaltatasLista.innerHTML = '';
        data.forEach(szolgaltatas => elemek.szolgaltatasLista.appendChild(szolgaltatasKartya(szolgaltatas)));
    }

    function szolgaltatasKartya(szolgaltatas) {
        const ora = Math.floor((szolgaltatas.duration_minutes || 0) / 60);
        const perc = (szolgaltatas.duration_minutes || 0) % 60;
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya';
        kartya.dataset.id = szolgaltatas.id;

        kartya.innerHTML = `
            <div class="admin-db-grid admin-db-grid-szolgaltatas">
                <label class="admin-mezo admin-szolgaltatas-nev">Név<input type="text" data-mezo="name" value="${attr(szolgaltatas.name)}"></label>
                <div class="admin-szolgaltatas-fej-opciok">
                    <label class="admin-mezo admin-checkbox"><input type="checkbox" data-mezo="booking_enabled" ${szolgaltatas.booking_enabled ? 'checked' : ''}> Foglalható</label>
                    <label class="admin-mezo admin-checkbox"><input type="checkbox" data-mezo="active" ${szolgaltatas.active ? 'checked' : ''}> Látható</label>
                </div>
                <label class="admin-mezo admin-szolgaltatas-foglalasi-nev">Foglalási név<input type="text" data-mezo="description" value="${attr(szolgaltatas.description || '')}" placeholder="Ha üres, a teljes név látszik"></label>
                <label class="admin-mezo admin-sorrend-mezo">Sorrend<input type="number" step="1" data-mezo="sort_order" value="${Number(szolgaltatas.sort_order) || 0}"></label>
                <div class="admin-szolgaltatas-szamok">
                    <label class="admin-mezo">Ár<input type="text" data-mezo="price_text" value="${attr(szolgaltatas.price_text || '')}"></label>
                    <label class="admin-mezo">Óra<input type="number" min="0" step="1" data-mezo="ora" value="${ora}"></label>
                    <label class="admin-mezo">Perc<input type="number" min="0" max="59" step="1" data-mezo="perc" value="${perc}"></label>
                </div>
            </div>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb" data-szolgaltatas-mozgat="fel" aria-label="Tétel feljebb">↑ Feljebb</button>
                <button type="button" class="admin-kis-gomb" data-szolgaltatas-mozgat="le" aria-label="Tétel lejjebb">↓ Lejjebb</button>
                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-szolgaltatas-torles>Törlés</button>
            </div>
        `;

        return kartya;
    }

    async function szolgaltatasHozzaadas() {
        onlineStatusz('Új árlista tétel létrehozása...');

        const { error } = await allapot.kliens.from('services').insert({
            name: 'Új kategória - Új tétel',
            price_text: '',
            duration_minutes: 60,
            booking_enabled: true,
            active: true,
            sort_order: 999
        });

        if (error) {
            onlineStatusz('Nem sikerült létrehozni az új árlista tételt.', true);
            return;
        }

        onlineStatusz('Új árlista tétel létrehozva.');
        szolgaltatasokBetoltese();
    }

    async function szolgaltatasListaKattintas(event) {
        const kartya = event.target.closest('.admin-db-kartya');

        if (!kartya) {
            return;
        }

        const mozgatas = event.target.closest('[data-szolgaltatas-mozgat]');
        if (mozgatas) {
            szolgaltatasMozgatasa(kartya, mozgatas.dataset.szolgaltatasMozgat);
            return;
        }

        if (event.target.closest('[data-szolgaltatas-torles]')) {
            if (!window.confirm('Biztosan törlöd ezt az árlista tételt? A hozzá tartozó korábbi foglalások miatt a törlés sikertelen lehet.')) return;
            await rekordTorlese('services', kartya.dataset.id, szolgaltatasokBetoltese);
        }
    }

    function szolgaltatasMozgatasa(kartya, irany) {
        const lista = kartya.parentElement;
        const csere = irany === 'fel' ? kartya.previousElementSibling : kartya.nextElementSibling;
        if (!lista || !csere || !csere.classList.contains('admin-db-kartya')) return;

        if (irany === 'fel') lista.insertBefore(kartya, csere);
        else lista.insertBefore(csere, kartya);

        Array.from(lista.querySelectorAll('.admin-db-kartya')).forEach((elem, index) => {
            const sorrend = mezo(elem, 'sort_order');
            if (sorrend) sorrend.value = String((index + 1) * 10);
        });
        onlineStatusz('A sorrend módosult. A véglegesítéshez nyomd meg a Mentés gombot.');
    }

    async function szolgaltatasokMentese() {
        const kartyak = Array.from(document.querySelectorAll('#admin-szolgaltatas-lista .admin-db-kartya'));

        if (!kartyak.length) {
            onlineStatusz('Nincs menthető árlista tétel.');
            return;
        }

        onlineStatusz('Árlista mentése...');

        for (const kartya of kartyak) {
            const ora = szamMezo(kartya, 'ora');
            const perc = szamMezo(kartya, 'perc');

            const { error } = await allapot.kliens
                .from('services')
                .update({
                    name: mezo(kartya, 'name').value.trim(),
                    description: mezo(kartya, 'description').value.trim(),
                    price_text: mezo(kartya, 'price_text').value.trim(),
                    duration_minutes: (ora * 60) + perc,
                    sort_order: szamMezo(kartya, 'sort_order'),
                    booking_enabled: mezo(kartya, 'booking_enabled').checked,
                    active: mezo(kartya, 'active').checked
                })
                .eq('id', kartya.dataset.id);

            if (error) {
                onlineStatusz('Nem sikerült menteni az egyik árlista tételt.', true);
                return;
            }
        }

        onlineStatusz('Árlista mentve.');
        szolgaltatasokBetoltese();
    }

    async function idosavokBetoltese() {
        const elemek = adminElemek();
        const { data, error } = await allapot.kliens
            .from('availability_windows')
            .select('id,work_date,start_time,end_time,slot_step_minutes,active')
            .order('work_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) {
            onlineStatusz('Nem sikerült betölteni a dátumos idősávokat. Futtasd a dátumos Supabase migrációt.', true);
            return;
        }

        elemek.idosavLista.innerHTML = '';

        if (!data.length) {
            elemek.idosavLista.innerHTML = '<p class="admin-ures">Még nincs megadva foglalható dátum.</p>';
            return;
        }

        data.forEach(idosav => elemek.idosavLista.appendChild(idosavKartya(idosav)));
    }

    function idosavKartya(idosav) {
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya admin-idosav-kartya';
        kartya.dataset.id = idosav.id;

        kartya.innerHTML = `
            <div class="admin-idosav-grid admin-idosav-grid-kompakt">
                <label class="admin-mezo">Dátum<input type="date" data-mezo="work_date" value="${attr(idosav.work_date || maiDatum())}"></label>
                <label class="admin-mezo">Kezdés<input type="time" data-mezo="start_time" value="${attr(idosav.start_time?.slice(0, 5) || '09:00')}"></label>
                <label class="admin-mezo">Vége<input type="time" data-mezo="end_time" value="${attr(idosav.end_time?.slice(0, 5) || '18:00')}"></label>
                <button type="button" class="admin-kis-gomb admin-veszely-gomb admin-idosav-torles-x" data-idosav-torles aria-label="Törlés">×</button>
            </div>
        `;

        return kartya;
    }

    async function idosavListaKattintas(event) {
        const kartya = event.target.closest('.admin-db-kartya');

        if (!kartya) {
            return;
        }

        if (event.target.closest('[data-idosav-torles]')) {
            if (!window.confirm('Biztosan törlöd ezt a beállított napot?')) {
                return;
            }

            await rekordTorlese('availability_windows', kartya.dataset.id, idosavokBetoltese);
        }
    }

    async function idosavokOsszesTorlese() {
        if (!window.confirm('Biztosan törlöd az összes beállított foglalható napot? A meglévő foglalásokat ez nem törli.')) {
            return;
        }

        onlineStatusz('Összes beállított nap törlése...');

        const { data, error: listaHiba } = await allapot.kliens
            .from('availability_windows')
            .select('id');

        if (listaHiba) {
            onlineStatusz('Nem sikerült lekérni a törlendő napokat.', true);
            return;
        }

        const idk = (data || []).map(sor => sor.id);

        if (!idk.length) {
            onlineStatusz('Nincs törölhető beállított nap.');
            return;
        }

        const { error } = await allapot.kliens
            .from('availability_windows')
            .delete()
            .in('id', idk);

        if (error) {
            onlineStatusz('Nem sikerült törölni az összes beállított napot.', true);
            return;
        }

        onlineStatusz('Minden beállított nap törölve.');
        idosavokBetoltese();
    }

    async function idosavLepesOsszesAlkalmazasa() {
        const lepes = naptarKozosLepesErtek();

        onlineStatusz('Lépés alkalmazása minden beállított napra...');

        const { data, error: listaHiba } = await allapot.kliens
            .from('availability_windows')
            .select('id');

        if (listaHiba) {
            onlineStatusz('Nem sikerült lekérni a beállított napokat.', true);
            return;
        }

        const idk = (data || []).map(sor => sor.id);

        if (!idk.length) {
            onlineStatusz('Nincs módosítható beállított nap.');
            return;
        }

        const { error } = await allapot.kliens
            .from('availability_windows')
            .update({ slot_step_minutes: lepes })
            .in('id', idk);

        if (error) {
            onlineStatusz('Nem sikerült alkalmazni a lépést minden napra.', true);
            return;
        }

        allapot.naptarKijelolesek.forEach((ertek, datum) => {
            allapot.naptarKijelolesek.set(datum, {
                ...ertek,
                slot_step_minutes: lepes
            });
        });

        naptarKijeloltListaRenderelese();
        onlineStatusz(`A ${lepes} perces lépés minden beállított napra alkalmazva.`);
        idosavokBetoltese();
    }

    async function idosavokMentese() {
        const kartyak = Array.from(document.querySelectorAll('#admin-idosav-lista .admin-db-kartya'));

        if (!kartyak.length) {
            return;
        }

        onlineStatusz('Meglévő dátumos idősávok mentése...');

        for (const kartya of kartyak) {
            if (mezo(kartya, 'end_time').value <= mezo(kartya, 'start_time').value) {
                onlineStatusz('A sáv vége legyen később, mint a kezdés.', true);
                return;
            }

            const { error } = await allapot.kliens
                .from('availability_windows')
                .update({
                    work_date: mezo(kartya, 'work_date').value,
                    start_time: mezo(kartya, 'start_time').value,
                    end_time: mezo(kartya, 'end_time').value,
                    active: true
                })
                .eq('id', kartya.dataset.id);

            if (error) {
                onlineStatusz('Nem sikerült menteni az egyik idősávot.', true);
                return;
            }
        }

        onlineStatusz('Dátumos idősávok mentve.');
        idosavokBetoltese();
    }

    async function beallitasokBetoltese() {
        const elemek = adminElemek();

        if (!elemek.telefonLathato) {
            return;
        }

        const { data, error } = await allapot.kliens
            .from('site_settings')
            .select('value')
            .eq('key', 'telefon_lathato')
            .maybeSingle();

        if (error) {
            onlineStatusz('Az online beállítások még nem érhetők el. Futtasd a friss Supabase SQL-t.', true);
            elemek.telefonLathato.checked = true;
            return;
        }

        elemek.telefonLathato.checked = data?.value?.visible !== false;
    }

    async function beallitasokMentese() {
        const elemek = adminElemek();

        if (!elemek.telefonLathato) {
            return;
        }

        onlineStatusz('Online beállítások mentése...');

        const { error } = await allapot.kliens
            .from('site_settings')
            .upsert({
                key: 'telefon_lathato',
                value: { visible: elemek.telefonLathato.checked },
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        onlineStatusz(error ? 'Nem sikerült menteni az online beállításokat. Futtasd a friss Supabase SQL-t.' : 'Online beállítások mentve.', Boolean(error));
    }

    async function tiltasokBetoltese() {
        const elemek = adminElemek();
        const { data, error } = await allapot.kliens
            .from('blocked_times')
            .select('id,starts_at,ends_at,reason')
            .order('starts_at', { ascending: false })
            .limit(80);

        if (error) {
            onlineStatusz('Nem sikerült betölteni a foglalt időket.', true);
            return;
        }

        elemek.tiltasLista.innerHTML = '';

        if (!data.length) {
            elemek.tiltasLista.innerHTML = '<p class="admin-ures">Nincs külön felvett foglalt idő.</p>';
            return;
        }

        data.forEach(tiltas => elemek.tiltasLista.appendChild(tiltasKartya(tiltas)));
    }

    function tiltasKartya(tiltas) {
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya';
        kartya.dataset.id = tiltas.id;
        const megjegyzes = tiltas.reason?.trim() || 'Kézi foglalás';
        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div>
                    <h3>${html(megjegyzes)}</h3>
                    <p>${html(datumIdo(tiltas.starts_at))} - ${html(datumIdo(tiltas.ends_at, true))}</p>
                </div>
                <button type="button" class="admin-kis-gomb" data-tiltas-torles>Törlés</button>
            </div>
        `;

        return kartya;
    }

    async function tiltasHozzaadas() {
        const elemek = adminElemek();

        const megjegyzes = elemek.tiltasOk.value.trim();

        if (!elemek.tiltasDatum.value || !elemek.tiltasKezdes.value || !elemek.tiltasVege.value || !megjegyzes) {
            onlineStatusz('Add meg a dátumot, a kezdést, a végét és a név / megjegyzés mezőt.', true);
            return;
        }

        if (elemek.tiltasVege.value <= elemek.tiltasKezdes.value) {
            onlineStatusz('A foglalt idő vége legyen később, mint a kezdés.', true);
            return;
        }

        onlineStatusz('Foglalt idő mentése...');

        const { error } = await allapot.kliens.from('blocked_times').insert({
            starts_at: helyiDatumIdoIso(elemek.tiltasDatum.value, elemek.tiltasKezdes.value),
            ends_at: helyiDatumIdoIso(elemek.tiltasDatum.value, elemek.tiltasVege.value),
            reason: megjegyzes
        });

        if (error) {
            onlineStatusz('Nem sikerült menteni a foglalt időt.', true);
            return;
        }

        elemek.tiltasForm.reset();
        idosavAlapertelmezes(adminElemek());
        onlineStatusz('Foglalt idő mentve. Ez az idő már nem lesz foglalható.');
        tiltasokBetoltese();
        foglalasokBetoltese();
    }

    async function tiltasListaKattintas(event) {
        const kartya = event.target.closest('.admin-db-kartya');

        if (!kartya || !event.target.closest('[data-tiltas-torles]')) {
            return;
        }

        await rekordTorlese('blocked_times', kartya.dataset.id, tiltasokBetoltese);
    }

    async function rekordTorlese(tabla, id, frissites) {
        if (!id) {
            return;
        }

        onlineStatusz('Törlés...');

        const { error } = await allapot.kliens
            .from(tabla)
            .delete()
            .eq('id', id);

        if (error) {
            onlineStatusz('Nem sikerült törölni. Lehet, hogy más adat még hivatkozik rá.', true);
            return;
        }

        onlineStatusz('Törölve.');
        frissites();
    }

    function adminTabValtas(tab) {
        allapot.aktivTab = tab || 'foglalasok';

        document.querySelectorAll('.admin-tab').forEach(gomb => {
            gomb.classList.toggle('aktiv', gomb.dataset.adminTab === tab);
        });

        document.querySelectorAll('.admin-db-panel').forEach(panel => {
            panel.classList.toggle('aktiv', panel.id === `admin-panel-${tab}`);
        });
    }

    async function idopontUtkozesHiba(kartya, startsAt, endsAt, statusz) {
        const aktivFoglalas = kartya.dataset.tipus !== 'booking' || ['pending', 'confirmed'].includes(statusz);

        if (!aktivFoglalas) {
            return '';
        }

        const bookingQuery = allapot.kliens
            .from('bookings')
            .select('id,customer_name')
            .in('status', ['pending', 'confirmed'])
            .lt('starts_at', endsAt)
            .gt('ends_at', startsAt)
            .limit(1);

        if (kartya.dataset.tipus === 'booking') {
            bookingQuery.neq('id', kartya.dataset.id);
        }

        const { data: foglalasUtkozes, error: foglalasHiba } = await bookingQuery;

        if (foglalasHiba) {
            return 'Nem sikerült ellenőrizni az időpont ütközést.';
        }

        if (foglalasUtkozes?.length) {
            return `Ez az időpont ütközik egy másik foglalással: ${foglalasUtkozes[0].customer_name || 'név nélkül'}.`;
        }

        const tiltasQuery = allapot.kliens
            .from('blocked_times')
            .select('id,reason')
            .lt('starts_at', endsAt)
            .gt('ends_at', startsAt)
            .limit(1);

        if (kartya.dataset.tipus === 'blocked') {
            tiltasQuery.neq('id', kartya.dataset.id);
        }

        const { data: tiltasUtkozes, error: tiltasHiba } = await tiltasQuery;

        if (tiltasHiba) {
            return 'Nem sikerült ellenőrizni a kézzel felvett foglalt időket.';
        }

        if (tiltasUtkozes?.length) {
            return `Ez az időpont ütközik egy kézzel felvett foglalt idővel: ${tiltasUtkozes[0].reason || 'külső foglalás'}.`;
        }

        return '';
    }

    function idopontModositasAdatok(kartya) {
        const datum = idopontMezo(kartya, 'date')?.value;
        const kezdes = idopontMezo(kartya, 'start_time')?.value;
        const vege = idopontMezo(kartya, 'end_time')?.value;

        if (!datum || !kezdes || !vege) {
            return { hiba: 'A módosított foglalásnál add meg a dátumot, a kezdést és a végét.' };
        }

        if (vege <= kezdes) {
            return { hiba: 'A módosított foglalás vége legyen később, mint a kezdés.' };
        }

        if (kartya.dataset.tipus === 'blocked' && !idopontMezo(kartya, 'reason')?.value.trim()) {
            return { hiba: 'A kézzel felvett foglalt időnél a név / megjegyzés mező kötelező.' };
        }

        return {
            startsAt: helyiDatumIdoIso(datum, kezdes),
            endsAt: helyiDatumIdoIso(datum, vege)
        };
    }

    function idopontMezo(kartya, nev) {
        return kartya.querySelector(`[data-idopont-mezo="${nev}"]`);
    }

    function statuszOption(ertek, cimke, aktiv) {
        return `<option value="${ertek}" ${ertek === aktiv ? 'selected' : ''}>${cimke}</option>`;
    }

    function mezo(kartya, nev) {
        return kartya.querySelector(`[data-mezo="${nev}"]`);
    }

    function szamMezo(kartya, nev) {
        const szam = Number.parseInt(mezo(kartya, nev).value, 10);
        return Number.isFinite(szam) && szam >= 0 ? szam : 0;
    }

    function isoHetNapja(datumSzovegErtek) {
        const nap = datumObjektum(datumSzovegErtek).getDay();
        return nap === 0 ? 7 : nap;
    }

    function datumObjektum(datumSzovegErtek) {
        const [ev, honap, nap] = datumSzovegErtek.split('-').map(Number);
        return new Date(ev, honap - 1, nap, 12, 0, 0);
    }

    function helyiDatumIdoIso(datumSzovegErtek, idoSzovegErtek) {
        const [ev, honap, nap] = datumSzovegErtek.split('-').map(Number);
        const [ora, perc] = idoSzovegErtek.split(':').map(Number);
        return new Date(ev, honap - 1, nap, ora, perc, 0).toISOString();
    }

    function datumSzoveg(datum) {
        const ev = datum.getFullYear();
        const honap = String(datum.getMonth() + 1).padStart(2, '0');
        const nap = String(datum.getDate()).padStart(2, '0');

        return `${ev}-${honap}-${nap}`;
    }

    function datumIdo(ertek, csakIdo = false) {
        const datum = new Date(ertek);
        const opciok = csakIdo
            ? { hour: '2-digit', minute: '2-digit' }
            : { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };

        return new Intl.DateTimeFormat('hu-HU', opciok).format(datum);
    }

    function datumIdoRovid(ertek, csakIdo = false) {
        const datum = new Date(ertek);
        const nap = String(datum.getDate()).padStart(2, '0');
        const honap = String(datum.getMonth() + 1).padStart(2, '0');
        const ev = String(datum.getFullYear()).slice(-2);
        const ora = String(datum.getHours()).padStart(2, '0');
        const perc = String(datum.getMinutes()).padStart(2, '0');
        return csakIdo ? `${ora}:${perc}` : `${nap}.${honap}.${ev} ${ora}:${perc}`;
    }

    function datumInputErtek(ertek) {
        const datum = new Date(ertek);
        return datumSzoveg(datum);
    }

    function idoInputErtek(ertek) {
        const datum = new Date(ertek);
        const ora = String(datum.getHours()).padStart(2, '0');
        const perc = String(datum.getMinutes()).padStart(2, '0');

        return `${ora}:${perc}`;
    }

    function maiDatum() {
        const ma = new Date();
        const ev = ma.getFullYear();
        const honap = String(ma.getMonth() + 1).padStart(2, '0');
        const nap = String(ma.getDate()).padStart(2, '0');

        return `${ev}-${honap}-${nap}`;
    }

    function maiHonap() {
        const ma = new Date();
        const ev = ma.getFullYear();
        const honap = String(ma.getMonth() + 1).padStart(2, '0');

        return `${ev}-${honap}`;
    }

    function authStatusz(elemek, szoveg, hiba = false) {
        elemek.authStatusz.textContent = szoveg;
        elemek.authStatusz.classList.toggle('hiba', Boolean(hiba));
    }

    function onlineStatusz(szoveg, hiba = false) {
        const elem = document.getElementById('admin-online-status');

        if (!elem) {
            return;
        }

        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }

    function naptarStatusz(szoveg, hiba = false) {
        const elem = document.getElementById('admin-naptar-status');

        if (!elem) {
            return;
        }

        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }

    function jelszoStatusz(szoveg, hiba = false) {
        const elem = document.getElementById('admin-jelszo-status');

        if (!elem) {
            return;
        }

        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }

    function html(ertek) {
        return String(ertek || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function attr(ertek) {
        return html(ertek);
    }
})();
