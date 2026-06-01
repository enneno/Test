(function () {
    const ADMIN_EMAIL = 'llevisimon@gmail.com';
    const FOGLALAS_OLDAL_MERET = 10;
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const allapot = {
        kliens: null,
        session: null,
        aktivTab: 'foglalasok',
        foglalasOldal: 1,
        foglalasElemek: [],
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
            szolgaltatasLista: document.getElementById('admin-szolgaltatas-lista'),
            szolgaltatasHozzaadas: document.getElementById('admin-szolgaltatas-hozzaadas'),
            idosavLista: document.getElementById('admin-idosav-lista'),
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
                <div class="admin-naptar-datum">${html(datumFelirat(datum))}</div>
                <label class="admin-mezo">Kezdés<input type="time" data-naptar-mezo="start_time" value="${attr(ertek.start_time)}"></label>
                <label class="admin-mezo">Vége<input type="time" data-naptar-mezo="end_time" value="${attr(ertek.end_time)}"></label>
                <label class="admin-mezo">Lépés<input type="number" min="5" step="5" data-naptar-mezo="slot_step_minutes" value="${Number(ertek.slot_step_minutes) || 30}"></label>
                <button type="button" class="admin-kis-gomb" data-naptar-torles>Törlés</button>
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
            slot_step_minutes: Number(ertek.slot_step_minutes) || 30,
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
            slot_step_minutes: Number.parseInt(sor.querySelector('[data-naptar-mezo="slot_step_minutes"]').value, 10) || 30
        });
    }

    function naptarAlapIdosav() {
        const elemek = adminElemek();

        return {
            start_time: elemek.naptarKozosKezdes?.value || '09:00',
            end_time: elemek.naptarKozosVege?.value || '18:00',
            slot_step_minutes: Number.parseInt(elemek.naptarKozosLepes?.value, 10) || 30
        };
    }

    function naptarHonapLepes(irany) {
        const elemek = adminElemek();
        const [ev, honap] = elemek.naptarHonap.value.split('-').map(Number);
        const datum = new Date(ev, honap - 1 + irany, 1, 12, 0, 0);
        elemek.naptarHonap.value = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}`;
        idosavNaptarRenderelese();
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

        if (tab === 'beallitasok') {
            await beallitasokMentese();
            return;
        }

        if (window.lumiAdminAdatokModositva?.()) {
            window.lumiAdminAdatokLetoltese?.();
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

        const { data: foglalasok, error: foglalasHiba } = await allapot.kliens
            .from('bookings')
            .select('id,customer_name,customer_phone,customer_email,note,starts_at,ends_at,status,created_at,services(name,price_text)')
            .order('starts_at', { ascending: false })
            .limit(120);

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

    function foglalasKartya(foglalas) {
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya';
        kartya.dataset.id = foglalas.id;
        kartya.dataset.tipus = 'booking';

        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div>
                    <h3>${html(foglalas.customer_name)}</h3>
                    <p>${html(datumIdo(foglalas.starts_at))} - ${html(datumIdo(foglalas.ends_at, true))}</p>
                </div>
                <select class="admin-db-statusz" data-foglalas-statusz>
                    ${statuszOption('pending', 'Függőben', foglalas.status)}
                    ${statuszOption('confirmed', 'Visszaigazolva', foglalas.status)}
                    ${statuszOption('done', 'Kész', foglalas.status)}
                    ${statuszOption('cancelled', 'Lemondva', foglalas.status)}
                </select>
            </div>
            <p><strong>Szolgáltatás:</strong> ${html(foglalas.services?.name || 'Törölt szolgáltatás')}</p>
            <p><strong>Telefon:</strong> <a href="tel:${html(foglalas.customer_phone.replace(/\s/g, ''))}">${html(foglalas.customer_phone)}</a></p>
            <p><strong>Email:</strong> <a href="mailto:${html(foglalas.customer_email)}">${html(foglalas.customer_email)}</a></p>
            ${foglalas.note ? `<p><strong>Megjegyzés:</strong> ${html(foglalas.note)}</p>` : ''}
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb" data-foglalas-torles>Eltávolítás</button>
            </div>
        `;

        return kartya;
    }

    function tiltasFoglalasKartya(tiltas) {
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya admin-db-kartya-tiltas';
        kartya.dataset.id = tiltas.id;
        kartya.dataset.tipus = 'blocked';
        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div>
                    <h3>Kézzel felvett foglalt idő</h3>
                    <p>${html(datumIdo(tiltas.starts_at))} - ${html(datumIdo(tiltas.ends_at, true))}</p>
                </div>
                <span class="admin-db-statusz admin-db-statusz-fix">Foglalt</span>
            </div>
            <p><strong>Ok:</strong> ${html(tiltas.reason || 'Külső foglalás')}</p>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb" data-foglalas-torles>Eltávolítás</button>
            </div>
        `;

        return kartya;
    }

    async function foglalasStatuszokMentese() {
        const kartyak = Array.from(document.querySelectorAll('#admin-foglalas-lista .admin-db-kartya[data-tipus="booking"]'));

        if (!kartyak.length) {
            onlineStatusz('Nincs menthető foglalási státusz ezen az oldalon.');
            return;
        }

        onlineStatusz('Foglalási státuszok mentése...');

        for (const kartya of kartyak) {
            const select = kartya.querySelector('[data-foglalas-statusz]');
            const { error } = await allapot.kliens
                .from('bookings')
                .update({ status: select.value })
                .eq('id', kartya.dataset.id);

            if (error) {
                onlineStatusz('Nem sikerült menteni az egyik foglalást.', true);
                return;
            }
        }

        onlineStatusz('Foglalási státuszok mentve.');
        foglalasokBetoltese();
    }

    async function foglalasListaKattintas(event) {
        const torles = event.target.closest('[data-foglalas-torles]');

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

        await rekordTorlese(tabla, id, foglalasokBetoltese);
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
                <label class="admin-mezo">Név<input type="text" data-mezo="name" value="${attr(szolgaltatas.name)}"></label>
                <label class="admin-mezo">Foglalási név<input type="text" data-mezo="description" value="${attr(szolgaltatas.description || '')}" placeholder="Ha üres, a teljes név látszik"></label>
                <label class="admin-mezo">Ár<input type="text" data-mezo="price_text" value="${attr(szolgaltatas.price_text || '')}"></label>
                <div class="admin-ido-par">
                    <label class="admin-mezo">Óra<input type="number" min="0" step="1" data-mezo="ora" value="${ora}"></label>
                    <label class="admin-mezo">Perc<input type="number" min="0" max="59" step="1" data-mezo="perc" value="${perc}"></label>
                </div>
                <label class="admin-mezo">Sorrend <span>kisebb szám előrébb</span><input type="number" step="1" data-mezo="sort_order" value="${Number(szolgaltatas.sort_order) || 0}"></label>
                <label class="admin-mezo admin-checkbox"><input type="checkbox" data-mezo="booking_enabled" ${szolgaltatas.booking_enabled ? 'checked' : ''}> Foglalható</label>
                <label class="admin-mezo admin-checkbox"><input type="checkbox" data-mezo="active" ${szolgaltatas.active ? 'checked' : ''}> Látható</label>
            </div>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb" data-szolgaltatas-torles>Törlés</button>
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

        if (event.target.closest('[data-szolgaltatas-torles]')) {
            await rekordTorlese('services', kartya.dataset.id, szolgaltatasokBetoltese);
        }
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
        kartya.className = 'admin-db-kartya';
        kartya.dataset.id = idosav.id;

        kartya.innerHTML = `
            <div class="admin-db-grid">
                <label class="admin-mezo">Dátum<input type="date" data-mezo="work_date" value="${attr(idosav.work_date || maiDatum())}"></label>
                <label class="admin-mezo">Kezdés<input type="time" data-mezo="start_time" value="${attr(idosav.start_time?.slice(0, 5) || '09:00')}"></label>
                <label class="admin-mezo">Vége<input type="time" data-mezo="end_time" value="${attr(idosav.end_time?.slice(0, 5) || '18:00')}"></label>
                <label class="admin-mezo">Lépés percben<input type="number" min="5" step="5" data-mezo="slot_step_minutes" value="${Number(idosav.slot_step_minutes) || 30}"></label>
                <label class="admin-mezo admin-checkbox"><input type="checkbox" data-mezo="active" ${idosav.active ? 'checked' : ''}> Aktív</label>
            </div>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb" data-idosav-torles>Törlés</button>
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
            await rekordTorlese('availability_windows', kartya.dataset.id, idosavokBetoltese);
        }
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
                    slot_step_minutes: szamMezo(kartya, 'slot_step_minutes'),
                    active: mezo(kartya, 'active').checked
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
        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div>
                    <h3>${html(datumIdo(tiltas.starts_at))}</h3>
                    <p>Vége: ${html(datumIdo(tiltas.ends_at))}</p>
                </div>
                <button type="button" class="admin-kis-gomb" data-tiltas-torles>Törlés</button>
            </div>
            <p><strong>Ok:</strong> ${html(tiltas.reason || 'Külső foglalás')}</p>
        `;

        return kartya;
    }

    async function tiltasHozzaadas() {
        const elemek = adminElemek();

        if (!elemek.tiltasDatum.value || !elemek.tiltasKezdes.value || !elemek.tiltasVege.value) {
            onlineStatusz('Add meg a dátumot, a kezdést és a végét.', true);
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
            reason: elemek.tiltasOk.value.trim() || 'Külső foglalás'
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
