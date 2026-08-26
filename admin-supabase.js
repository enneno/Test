// Generated from src/admin by npm run build. Edit the source parts, not this file.

(function () {
    const ADMIN_EMAIL = 'llevisimon@gmail.com';
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;
    const SZOLGALTATAS_KUPON_KATEGORIAK = ['\u00c9p\u00edt\u00e9s', 'T\u00f6lt\u00e9s', 'G\u00e9l lakk', 'Manik\u0171r', 'D\u00edsz\u00edt\u00e9s', 'Leszed\u00e9s'];
    const ADMIN_FOGLALAS_LIMIT = 500;
    const allapot = {
        kliens: null,
        session: null,
        aktivTab: 'foglalasok',
        foglalasOldal: 1,
        foglalasOldalMeret: 10,
        foglalasElemek: [],
        foglalasKereses: '',
        foglalasStatuszSzuro: 'all',
        foglalasNezet: 'lista',
        foglalasNaptarHonap: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        foglalasNaptarKijeloltDatum: '',
        lemondasEsemenyek: new Map(),
        szolgaltatasok: [],
        kuponok: [],
        vendegProfilok: [],
        vendegProfilKeresId: 0,
        esemenynaploOldal: 1,
        esemenynaploOldalMeret: 10,
        esemenynaploElemek: [],
        naptarKijelolesek: new Map(),
        tiltasStatuszTamogatott: true
    };

    window.LumiAdminExportData = Object.freeze({
        foglalasok: () => aktualisFoglalasExportAdatok(),
        esemenyek: () => aktualisEsemenyExportAdatok()
    });


    document.addEventListener('DOMContentLoaded', () => {
        const elemek = adminElemek();

        if (!elemek.loginForm || !elemek.tartalom) {
            return;
        }

        if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
            authStatusz(elemek, 'A Supabase kapcsolat nincs beállítva. Ellenőrizd a supabase-config.js fájlt.', true);
            return;
        }

        allapot.kliens = window.lumiSupabaseClient();

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
        elemek.vendegLemondasMegnyitas?.addEventListener('click', vendegLemondasokMegnyitasa);
        elemek.vendegLemondasTudomasulvetel?.addEventListener('click', vendegLemondasokTudomasulvetele);
        elemek.esemenynaploFrissites?.addEventListener('click', esemenynaploBetoltese);
        elemek.emailTesztKuldes?.addEventListener('click', emailTesztekKuldese);
        elemek.szolgaltatasHozzaadas?.addEventListener('click', szolgaltatasHozzaadas);
        elemek.kuponHozzaadas?.addEventListener('click', kuponHozzaadas);
        idosavAlapertelmezes(elemek);
        idosavNaptarInicializalasa(elemek);
        elemek.tiltasForm?.addEventListener('submit', event => {
            event.preventDefault();
        });

        document.querySelectorAll('.admin-tab').forEach(gomb => {
            gomb.addEventListener('click', () => adminTabValtas(gomb.dataset.adminTab));
        });

        elemek.foglalasLista?.addEventListener('click', foglalasListaKattintas);
        elemek.foglalasNezetGombok.forEach(gomb => {
            gomb.addEventListener('click', () => foglalasNezetValtasa(gomb.dataset.foglalasNezet));
        });
        elemek.foglalasNaptar?.addEventListener('click', foglalasNaptarKattintas);
        elemek.foglalasLapozo?.addEventListener('click', foglalasLapozoKattintas);
        elemek.foglalasLapozo?.addEventListener('change', foglalasLapozoKattintas);
        elemek.foglalasLapozoFelso?.addEventListener('click', foglalasLapozoKattintas);
        elemek.foglalasLapozoFelso?.addEventListener('change', foglalasLapozoKattintas);
        elemek.foglalasKeresesTorles?.addEventListener('click', foglalasKeresesTorlese);
        elemek.foglalasKereses?.addEventListener('input', () => {
            allapot.foglalasKereses = elemek.foglalasKereses.value.trim();
            allapot.foglalasOldal = 1;
            foglalasKeresesTorlesGombFrissitese(elemek);
            foglalasListaRenderelese();
        });
        foglalasKeresesTorlesGombFrissitese(elemek);
        elemek.foglalasStatuszSzuro?.addEventListener('change', () => {
            allapot.foglalasStatuszSzuro = elemek.foglalasStatuszSzuro.value || 'all';
            allapot.foglalasOldal = 1;
            foglalasListaRenderelese();
        });
        elemek.szolgaltatasLista?.addEventListener('click', szolgaltatasListaKattintas);
        elemek.kuponLista?.addEventListener('click', kuponListaKattintas);
        elemek.esemenynaploLapozo?.addEventListener('click', esemenynaploLapozoKattintas);
        elemek.esemenynaploLapozo?.addEventListener('change', esemenynaploLapozoKattintas);
        elemek.esemenynaploLapozoFelso?.addEventListener('click', esemenynaploLapozoKattintas);
        elemek.esemenynaploLapozoFelso?.addEventListener('change', esemenynaploLapozoKattintas);
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
            onlineStatusz: document.getElementById('admin-online-status'),
            emailTesztKuldes: document.getElementById('admin-email-teszt-kuldes'),
            emailTesztStatusz: document.getElementById('admin-email-teszt-statusz'),
            foglalasLista: document.getElementById('admin-foglalas-lista'),
            foglalasListaNezet: document.getElementById('admin-foglalas-lista-nezet'),
            foglalasNezetGombok: Array.from(document.querySelectorAll('[data-foglalas-nezet]')),
            foglalasOsszefoglalo: document.getElementById('admin-foglalas-osszefoglalo'),
            foglalasNaptar: document.getElementById('admin-foglalas-naptar'),
            foglalasNaptarCim: document.getElementById('admin-foglalas-naptar-cim'),
            foglalasNaptarRacs: document.getElementById('admin-foglalas-naptar-racs'),
            foglalasNapiCim: document.getElementById('admin-foglalas-napi-cim'),
            foglalasNapiDarab: document.getElementById('admin-foglalas-napi-darab'),
            foglalasNapiLista: document.getElementById('admin-foglalas-napi-lista'),
            foglalasLapozo: document.getElementById('admin-foglalas-lapozo'),
            foglalasLapozoFelso: document.getElementById('admin-foglalas-lapozo-felso'),
            foglalasKereses: document.getElementById('admin-foglalas-kereses'),
            foglalasKeresesTorles: document.getElementById('admin-foglalas-kereses-torles'),
            foglalasStatuszSzuro: document.getElementById('admin-foglalas-statusz-szuro'),
            foglalasFrissites: document.getElementById('admin-foglalas-frissites'),
            vendegLemondasJelzes: document.getElementById('admin-vendeg-lemondas-jelzes'),
            vendegLemondasDarab: document.getElementById('admin-vendeg-lemondas-darab'),
            vendegLemondasUzenet: document.getElementById('admin-vendeg-lemondas-uzenet'),
            vendegLemondasMegnyitas: document.getElementById('admin-vendeg-lemondas-megnyitas'),
            vendegLemondasTudomasulvetel: document.getElementById('admin-vendeg-lemondas-tudomasulvetel'),
            esemenynaploLista: document.getElementById('admin-esemenynaplo-lista'),
            esemenynaploFrissites: document.getElementById('admin-esemenynaplo-frissites'),
            esemenynaploLapozo: document.getElementById('admin-esemenynaplo-lapozo'),
            esemenynaploLapozoFelso: document.getElementById('admin-esemenynaplo-lapozo-felso'),
            szolgaltatasLista: document.getElementById('admin-szolgaltatas-lista'),
            szolgaltatasHozzaadas: document.getElementById('admin-szolgaltatas-hozzaadas'),
            kuponLista: document.getElementById('admin-kupon-lista'),
            kuponHozzaadas: document.getElementById('admin-kupon-hozzaadas'),
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

    function foglalasKeresesTorlesGombFrissitese(elemek = adminElemek()) {
        if (!elemek.foglalasKeresesTorles || !elemek.foglalasKereses) return;
        elemek.foglalasKeresesTorles.hidden = !elemek.foglalasKereses.value.trim();
    }

    function foglalasKeresesTorlese() {
        const elemek = adminElemek();
        if (!elemek.foglalasKereses) return;

        elemek.foglalasKereses.value = '';
        allapot.foglalasKereses = '';
        allapot.foglalasOldal = 1;
        foglalasKeresesTorlesGombFrissitese(elemek);
        foglalasListaRenderelese();
        elemek.foglalasKereses.focus({ preventScroll: true });
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
                <button type="button" class="admin-kis-gomb admin-veszely-gomb admin-naptar-torles-x" data-naptar-torles aria-label="Törlés">×</button>
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
        return ev && honap && nap ? `${nap}/${honap}/${String(ev).slice(-2)}` : String(datumSzovegErtek || '');
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

        if (!window.LUMI_PASSWORD_POLICY?.isValid(ujJelszo)) {
            const kovetelmenyek = window.LUMI_PASSWORD_POLICY?.hint
                || '8–128 karakter, legalább egy kisbetű, egy nagybetű és egy szám.';
            jelszoStatusz(`A jelszó követelményei: ${kovetelmenyek}`, true);
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

    async function sessionAllapot(session, elemek) {
        allapot.session = session;
        const ellenorzesId = (allapot.adminJogosultsagKeresId || 0) + 1;
        allapot.adminJogosultsagKeresId = ellenorzesId;
        elemek.authPanel.hidden = Boolean(session);
        elemek.tartalom.hidden = true;
        if (elemek.lebegoMentes) {
            elemek.lebegoMentes.hidden = true;
        }

        if (!session) return;

        const { data: admin, error } = await allapot.kliens.rpc('is_lumi_admin');
        if (ellenorzesId !== allapot.adminJogosultsagKeresId) return;

        if (error || admin !== true) {
            await allapot.kliens.auth.signOut();
            authStatusz(elemek, 'Ehhez a felülethez nincs admin jogosultságod.', true);
            return;
        }

        elemek.tartalom.hidden = false;
        if (elemek.lebegoMentes) elemek.lebegoMentes.hidden = false;
        authStatusz(elemek, '');
        adminTabValtas(allapot.aktivTab);
        adatokFrissitese();
    }

    function adatokFrissitese() {
        foglalasokBetoltese();
        vendegProfilokBetoltese();
        esemenynaploBetoltese();
        szolgaltatasokBetoltese();
        kuponokBetoltese();
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

        if (tab === 'kuponok') {
            await kuponokMentese();
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

    const ADMIN_V2_TAB_GROUPS = Object.freeze({
        attekintes: 'attekintes',
        foglalasok: 'foglalasok',
        vendegek: 'vendegek',
        idosavok: 'munkaido',
        tiltasok: 'munkaido',
        szovegek: 'weboldal',
        szolgaltatasok: 'weboldal',
        kuponok: 'weboldal',
        esemenynaplo: 'kommunikacio',
        emailteszt: 'kommunikacio',
        beallitasok: 'beallitasok'
    });

    const ADMIN_V2_PAGE_COPY = Object.freeze({
        foglalasok: {
            kicker: 'Foglalások és kieső idők',
            title: 'Időpontok',
            save: 'Módosítások mentése'
        },
        vendegek: {
            kicker: 'Vendégfiókok',
            title: 'Regisztrált tagok'
        },
        idosavok: {
            kicker: 'Elérhetőség',
            title: 'Munkaidő',
            save: 'Munkaidő mentése'
        },
        tiltasok: {
            kicker: 'Elérhetőség',
            title: 'Kieső időszakok',
            save: 'Kieső idő mentése'
        },
        szovegek: {
            kicker: 'Tartalomkezelés',
            title: 'Weboldal',
            save: 'Tartalom mentése'
        },
        szolgaltatasok: {
            kicker: 'Weboldal és foglalás',
            title: 'Szolgáltatások és árlista',
            save: 'Árlista mentése'
        },
        kuponok: {
            kicker: 'Weboldal és foglalás',
            title: 'Ajánlatok és kuponok',
            save: 'Kuponok mentése'
        },
        esemenynaplo: {
            kicker: 'Emailek és értesítések',
            title: 'Kommunikáció'
        },
        emailteszt: {
            kicker: 'Emailek és értesítések',
            title: 'Email ellenőrzés'
        },
        beallitasok: {
            kicker: 'Rendszer és fiók',
            title: 'Beállítások',
            save: 'Beállítások mentése'
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        adminV2Inicializalasa();
    });

    function adminV2Inicializalasa() {
        const body = document.body;
        const tartalom = document.getElementById('admin-tartalom');
        const sidebar = document.querySelector('.admin-sidebar');
        const workspaceMain = document.querySelector('.admin-workspace-main');

        if (!body || !tartalom || !sidebar || !workspaceMain || body.dataset.adminV2Ready === 'true') {
            return;
        }

        body.dataset.adminV2Ready = 'true';
        body.classList.add('admin-v2');
        workspaceMain.id = workspaceMain.id || 'admin-v2-main';
        workspaceMain.tabIndex = -1;

        adminV2SkipLinkLetrehozasa(body, workspaceMain);
        adminV2AttekintesPanelLetrehozasa(workspaceMain);
        adminV2VendegPanelLetrehozasa(workspaceMain);
        adminV2BeallitasokPanelLetrehozasa(workspaceMain);
        adminV2SidebarLetrehozasa(sidebar);
        adminV2TopbarLetrehozasa(tartalom);
        adminV2PanelFejlecekLetrehozasa();
        adminV2AlmenuLetrehozasa();
        adminV2EsemenyekKapcsolasa(tartalom);
        adminV2AdatFigyelokKapcsolasa();
        adminV2MenuGesztusokKapcsolasa(body);

        allapot.aktivTab = 'attekintes';
        adminV2Valtas('attekintes');

        const sessionFigyelo = new MutationObserver(() => {
            if (!tartalom.hidden) {
                adminV2Valtas(allapot.aktivTab || 'attekintes');
                adminV2AttekintesFrissitese();
            }
        });
        sessionFigyelo.observe(tartalom, { attributes: true, attributeFilter: ['hidden'] });
    }

    function adminV2SkipLinkLetrehozasa(body, workspaceMain) {
        if (document.querySelector('.admin-v2-skip-link')) return;
        const link = document.createElement('a');
        link.className = 'admin-v2-skip-link';
        link.href = `#${workspaceMain.id}`;
        link.textContent = 'Ugr' + String.fromCharCode(225) + 's a tartalomhoz';
        body.prepend(link);
    }

    function adminV2SidebarLetrehozasa(sidebar) {
        const brand = document.createElement('div');
        brand.className = 'admin-v2-brand';
        brand.innerHTML = `
            <a href="/admin/" class="admin-v2-brand-home" data-admin-v2-home aria-label="Admin áttekintés">
                <span class="logo-lumi">Lumi</span><span class="logo-nails">Nails</span>
            </a>
            <span>Admin</span>
        `;

        const nav = document.createElement('nav');
        nav.className = 'admin-v2-nav';
        nav.setAttribute('aria-label', 'Admin fő navigáció');
        nav.innerHTML = `
            <p class="admin-v2-nav-label">Munkaterület</p>
            ${adminV2NavGomb('attekintes', 'Áttekintés', adminV2Ikon('overview'))}
            ${adminV2NavGomb('foglalasok', 'Időpontok', adminV2Ikon('calendar'), '<span class="admin-v2-nav-count" data-admin-v2-pending-count>0</span>')}
            ${adminV2NavGomb('vendegek', 'Regisztrált tagok', adminV2Ikon('users'))}
            ${adminV2NavGomb('munkaido', 'Munkaidő', adminV2Ikon('clock'))}
            ${adminV2NavGomb('weboldal', 'Weboldal', adminV2Ikon('website'))}
            ${adminV2NavGomb('kommunikacio', 'Kommunikáció', adminV2Ikon('mail'), '<span class="admin-v2-nav-alert" data-admin-v2-email-alert hidden><span class="sr-only">Emailhiba</span></span>')}
        `;

        const secondary = document.createElement('div');
        secondary.className = 'admin-v2-sidebar-bottom';
        secondary.innerHTML = `
            <a href="/" class="admin-v2-public-link">
                ${adminV2Ikon('website')}<span>Vissza a főoldalra</span>
            </a>
            ${adminV2NavGomb('beallitasok', 'Beállítások', adminV2Ikon('settings'))}
            <button type="button" class="admin-v2-profile" data-admin-v2-nav="beallitasok" aria-label="Fiók és beállítások megnyitása">
                <span class="admin-v2-avatar">SZ</span>
                <span><strong>Szofi</strong><small>Tulajdonos</small></span>
                ${adminV2Ikon('arrow')}
            </button>
            <button type="button" class="admin-v2-logout" data-admin-v2-logout>Kijelentkezés</button>
        `;

        sidebar.prepend(nav);
        sidebar.prepend(brand);
        sidebar.append(secondary);
        sidebar.classList.add('admin-v2-sidebar');

        const legacyTabs = sidebar.querySelector('.admin-tabs');
        legacyTabs?.classList.add('admin-v2-legacy-tabs');
    }

    function adminV2NavGomb(group, label, icon, suffix = '') {
        return `
            <button type="button" class="admin-v2-nav-item" data-admin-v2-nav="${group}">
                ${icon}<span>${label}</span>${suffix}
            </button>
        `;
    }

    function adminV2TopbarLetrehozasa(tartalom) {
        const topbar = document.createElement('header');
        topbar.className = 'admin-v2-topbar';
        topbar.innerHTML = `
            <div class="admin-v2-mobile-brand">
                <button type="button" class="admin-v2-icon-button" data-admin-v2-menu aria-label="Navigáció megnyitása" aria-expanded="false">
                    ${adminV2Ikon('menu')}
                </button>
                <a href="/admin/" class="admin-v2-mobile-home" data-admin-v2-home aria-label="Admin áttekintés">
                    <span class="logo-lumi">Lumi</span><span class="logo-nails">Nails</span>
                </a>
            </div>
            <div class="admin-v2-topbar-copy">
                <p class="admin-v2-topbar-section" data-admin-v2-current-label>Áttekintés</p>
                <p>${adminV2MaiDatumFelirat()}</p>
            </div>
            <div class="admin-v2-topbar-actions">
                <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-panel="tiltasok">
                    ${adminV2Ikon('plus')} Kieső idő
                </button>
                <div class="admin-v2-notification-wrap">
                    <button type="button" class="admin-v2-icon-button" data-admin-v2-notifications-toggle aria-label="Értesítések megnyitása" aria-expanded="false" aria-controls="admin-v2-notification-panel">
                        ${adminV2Ikon('bell')}<span class="admin-v2-notification-dot" data-admin-v2-email-alert data-admin-v2-notification-alert hidden></span>
                    </button>
                    <section id="admin-v2-notification-panel" class="admin-v2-notification-panel" data-admin-v2-notification-panel role="region" aria-label="Értesítések" hidden>
                        <header>
                            <strong>Értesítések</strong>
                            <small data-admin-v2-notification-summary>Minden rendezve</small>
                        </header>
                        <ul data-admin-v2-notification-list>
                            <li class="admin-v2-empty">Nincs új értesítés.</li>
                        </ul>
                    </section>
                </div>
            </div>
        `;

        const backdrop = document.createElement('button');
        backdrop.type = 'button';
        backdrop.className = 'admin-v2-nav-backdrop';
        backdrop.dataset.adminV2CloseMenu = '';
        backdrop.setAttribute('aria-label', 'Navigáció bezárása');

        tartalom.prepend(topbar);
        tartalom.append(backdrop);
    }

    function adminV2AttekintesPanelLetrehozasa(workspaceMain) {
        if (document.getElementById('admin-panel-attekintes')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'admin-panel-attekintes';
        panel.className = 'admin-db-panel admin-v2-overview-panel';
        panel.innerHTML = `
            <div class="admin-v2-page-heading admin-v2-overview-heading">
                <div>
                    <p class="admin-v2-kicker">Napi irányítópult</p>
                    <h1>Jó reggelt, Szofi</h1>
                    <p>A mai teendők és a következő napok foglalhatósága egy helyen.</p>
                </div>
                <div class="admin-v2-page-actions">
                    <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-panel="foglalasok" data-admin-v2-booking-view="naptar">${adminV2Ikon('calendar')} Naptár</button>
                    <button type="button" class="admin-v2-button admin-v2-button-primary" data-admin-v2-panel="tiltasok">${adminV2Ikon('plus')} Kieső idő</button>
                </div>
            </div>

            <section class="admin-v2-stat-grid" aria-label="Napi összefoglaló">
                ${adminV2StatKartya('Mai időpontok', 'admin-v2-stat-today', 'calendar')}
                ${adminV2StatKartya('Megerősítésre vár', 'admin-v2-stat-pending', 'clock', 'warning')}
                ${adminV2StatKartya('Email problémák', 'admin-v2-stat-email', 'mail', 'danger')}
                ${adminV2StatKartya('Foglalható időszak', 'admin-v2-stat-horizon', 'check', 'success')}
            </section>

            <div class="admin-v2-dashboard-grid">
                <div class="admin-v2-stack">
                    <section class="admin-v2-card">
                        <div class="admin-v2-card-header">
                            <div><h2>Mai nap</h2><p data-admin-v2-today-summary>Betöltés…</p></div>
                            <button type="button" class="admin-v2-inline-action" data-admin-v2-panel="foglalasok">Teljes lista ${adminV2Ikon('arrow')}</button>
                        </div>
                        <ol class="admin-v2-schedule-list" data-admin-v2-today-list></ol>
                    </section>
                    <section class="admin-v2-card">
                        <div class="admin-v2-card-header">
                            <div><h2>Következő napok</h2><p>Közelgő foglalások időrendben</p></div>
                            <button type="button" class="admin-v2-inline-action" data-admin-v2-panel="foglalasok" data-admin-v2-booking-view="naptar">Naptár ${adminV2Ikon('arrow')}</button>
                        </div>
                        <ol class="admin-v2-upcoming-list" data-admin-v2-upcoming-list></ol>
                    </section>
                </div>
                <div class="admin-v2-stack">
                    <section class="admin-v2-card">
                        <div class="admin-v2-card-header"><div><h2>Teendők</h2><p data-admin-v2-task-summary>Betöltés…</p></div></div>
                        <div class="admin-v2-card-body"><ol class="admin-v2-task-list" data-admin-v2-task-list></ol></div>
                    </section>
                    <section class="admin-v2-card">
                        <div class="admin-v2-card-header"><div><h2>Gyors műveletek</h2><p>A leggyakoribb feladatok</p></div></div>
                        <div class="admin-v2-card-body admin-v2-quick-actions">
                            <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-panel="tiltasok">${adminV2Ikon('clock')} Kieső idő</button>
                            <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-panel="idosavok">${adminV2Ikon('calendar')} Munkaidő</button>
                            <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-panel="szovegek">${adminV2Ikon('edit')} Tartalom</button>
                        </div>
                    </section>
                </div>
            </div>
        `;
        workspaceMain.prepend(panel);
    }

    function adminV2StatKartya(label, valueId, icon, tone = '') {
        return `
            <article class="admin-v2-stat-card${tone ? ` admin-v2-stat-${tone}` : ''}">
                <div><p>${label}</p><span>${adminV2Ikon(icon)}</span></div>
                <strong id="${valueId}">—</strong>
                <small id="${valueId}-meta">Adatok betöltése…</small>
            </article>
        `;
    }

    function adminV2BeallitasokPanelLetrehozasa(workspaceMain) {
        if (document.getElementById('admin-panel-beallitasok')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'admin-panel-beallitasok';
        panel.className = 'admin-db-panel admin-v2-settings-panel';
        panel.innerHTML = `
            <section class="admin-v2-settings-card">
                <div class="admin-v2-settings-header">
                    <h2>Weboldali elérhetőség</h2>
                    <p>A publikus oldalon megjelenő kapcsolati beállítások.</p>
                </div>
                <label class="admin-v2-setting-row" for="admin-telefon-lathato">
                    <span><strong>Telefonszám megjelenítése</strong><small>A fejlécben és a kapcsolatfelvételi lehetőségeknél.</small></span>
                    <input type="checkbox" id="admin-telefon-lathato">
                </label>
            </section>
            <section class="admin-v2-settings-card">
                <div class="admin-v2-settings-header">
                    <h2>Fiók és biztonság</h2>
                    <p>A bejelentkezett adminfiók kezelése.</p>
                </div>
                <div class="admin-v2-account-actions">
                    <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-password>Jelszó módosítása</button>
                    <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-logout>Kijelentkezés</button>
                </div>
                <div class="admin-v2-password-slot"></div>
            </section>
        `;
        workspaceMain.append(panel);

        const slot = panel.querySelector('.admin-v2-password-slot');
        const form = document.getElementById('admin-jelszo-form');
        const status = document.getElementById('admin-jelszo-status');
        if (form) slot.append(form);
        if (status) slot.append(status);
    }

    function adminV2PanelFejlecekLetrehozasa() {
        Object.entries(ADMIN_V2_PAGE_COPY).forEach(([tab, copy]) => {
            const panel = document.getElementById(`admin-panel-${tab}`);
            if (!panel || panel.querySelector(':scope > .admin-v2-page-heading')) {
                return;
            }

            const heading = document.createElement('div');
            heading.className = 'admin-v2-page-heading';
            heading.innerHTML = `
                <div>
                    <p class="admin-v2-kicker">${copy.kicker}</p>
                    <h1>${copy.title}</h1>
                </div>
                ${copy.save ? `<div class="admin-v2-page-actions"><button type="button" class="admin-v2-button admin-v2-button-primary" data-admin-v2-save>${adminV2Ikon('check')}<span>${copy.save}</span></button></div>` : ''}
            `;

            const pageActions = heading.querySelector('.admin-v2-page-actions');
            const exportGomb = tab === 'foglalasok'
                ? document.getElementById('admin-foglalas-export')
                : null;
            if (pageActions && exportGomb) {
                exportGomb.classList.remove('admin-kis-gomb');
                exportGomb.classList.add('admin-v2-button', 'admin-v2-button-secondary');
                pageActions.append(exportGomb);
            }

            const kapcsolodoMuvelet = {
                szovegek: document.getElementById('admin-cms-reload'),
                szolgaltatasok: document.getElementById('admin-szolgaltatas-hozzaadas'),
                kuponok: document.getElementById('admin-kupon-hozzaadas')
            }[tab];
            if (pageActions && kapcsolodoMuvelet) {
                const isReload = tab === 'szovegek';
                const regiTarolo = kapcsolodoMuvelet.closest('.admin-panel-akciok');
                kapcsolodoMuvelet.className = 'admin-v2-button admin-v2-button-secondary';
                kapcsolodoMuvelet.innerHTML = `${adminV2Ikon(isReload ? 'refresh' : 'plus')}<span>${isReload ? 'Újratöltés' : kapcsolodoMuvelet.textContent}</span>`;
                pageActions.prepend(kapcsolodoMuvelet);
                if (regiTarolo && !regiTarolo.children.length) regiTarolo.remove();
            }

            panel.prepend(heading);
        });
    }

    function adminV2AlmenuLetrehozasa() {
        const groups = [
            {
                tabs: ['idosavok', 'tiltasok'],
                items: [
                    ['idosavok', 'Foglalható napok'],
                    ['tiltasok', 'Kieső időszakok']
                ]
            },
            {
                tabs: ['szovegek', 'szolgaltatasok', 'kuponok'],
                items: [
                    ['szovegek', 'Oldalak és galéria'],
                    ['szolgaltatasok', 'Szolgáltatások'],
                    ['kuponok', 'Ajánlatok és kuponok']
                ]
            },
            {
                tabs: ['esemenynaplo', 'emailteszt'],
                items: [
                    ['esemenynaplo', 'Küldési események'],
                    ['emailteszt', 'Tesztküldés'],
                    ['email-sablonok', 'Email sablonok']
                ]
            }
        ];

        groups.forEach(group => {
            group.tabs.forEach(tab => {
                const panel = document.getElementById(`admin-panel-${tab}`);
                const heading = panel?.querySelector(':scope > .admin-v2-page-heading');
                if (!panel || !heading) return;

                const nav = document.createElement('nav');
                nav.className = 'admin-v2-subnav';
                nav.setAttribute('aria-label', 'Kapcsolódó adminnézetek');
                nav.innerHTML = group.items.map(([target, label]) => `
                    <button type="button" data-admin-v2-panel="${target}">${label}</button>
                `).join('');
                heading.after(nav);
            });
        });

        const eventPanel = document.getElementById('admin-panel-esemenynaplo');
        const subnav = eventPanel?.querySelector('.admin-v2-subnav');
        if (eventPanel && subnav && !document.getElementById('admin-v2-communication-summary')) {
            const summary = document.createElement('section');
            summary.id = 'admin-v2-communication-summary';
            summary.className = 'admin-v2-communication-summary';
            summary.innerHTML = `
                ${adminV2MiniStat('Mai email esemény', 'admin-v2-email-today')}
                ${adminV2MiniStat('Sikeres', 'admin-v2-email-success')}
                ${adminV2MiniStat('Nyitott hibák', 'admin-v2-email-failed')}
                ${adminV2MiniStat('Legutóbbi hiba', 'admin-v2-email-last-error')}
                <div class="admin-v2-communication-action">
                    <p data-admin-v2-email-ack-summary>Nincs nyitott emailhiba.</p>
                    <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-ack-email-errors hidden>Emailhibák nyugtázása</button>
                </div>
            `;
            subnav.after(summary);
        }
    }

    function adminV2MiniStat(label, id) {
        return `<div><span>${label}</span><strong id="${id}">—</strong></div>`;
    }

    function adminV2EsemenyekKapcsolasa(tartalom) {
        tartalom.addEventListener('click', event => {
            const adminHome = event.target.closest('[data-admin-v2-home]');
            if (adminHome) {
                event.preventDefault();
                adminV2Valtas('attekintes');
                return;
            }

            const notificationToggle = event.target.closest('[data-admin-v2-notifications-toggle]');
            if (notificationToggle) {
                adminV2ErtesitesekValtasa();
                return;
            }

            const notificationTarget = event.target.closest('[data-admin-v2-notification-target]');
            if (notificationTarget) {
                adminV2ErtesitesMegnyitasa(notificationTarget.dataset.adminV2NotificationTarget);
                return;
            }

            const nav = event.target.closest('[data-admin-v2-nav]');
            if (nav) {
                adminV2CsoportMegnyitasa(nav.dataset.adminV2Nav);
                return;
            }

            const panel = event.target.closest('[data-admin-v2-panel]');
            if (panel) {
                const target = panel.dataset.adminV2Panel;
                if (target === 'email-sablonok') {
                    adminV2EmailSablonokMegnyitasa();
                } else {
                    adminV2Valtas(target);
                    if (panel.dataset.adminV2BookingView) {
                        adminV2FoglalasNezetBeallitasa(panel.dataset.adminV2BookingView);
                    }
                }
                return;
            }

            const booking = event.target.closest('[data-admin-v2-booking-search]');
            if (booking) {
                adminV2FoglalasKeresese(booking.dataset.adminV2BookingSearch);
                return;
            }

            const emailAcknowledgement = event.target.closest('[data-admin-v2-ack-email-errors]');
            if (emailAcknowledgement) {
                adminV2EmailHibakNyugtazasa(emailAcknowledgement);
                return;
            }

            if (event.target.closest('[data-admin-v2-save]')) {
                const aktivPanel = event.target.closest('.admin-db-panel');
                if (aktivPanel?.id === 'admin-panel-szovegek') {
                    document.getElementById('admin-cms-save')?.click();
                    return;
                }
                lebegoMentes();
                return;
            }

            if (event.target.closest('[data-admin-v2-password]')) {
                adminElemek().jelszoValtasGomb?.click();
                return;
            }

            if (event.target.closest('[data-admin-v2-logout]')) {
                adminElemek().kijelentkezes?.click();
                return;
            }

            if (event.target.closest('[data-admin-v2-menu]')) {
                adminV2MenuNyitasa();
                return;
            }

            if (event.target.closest('[data-admin-v2-close-menu]')) {
                adminV2MenuBezarasa();
                return;
            }

            if (!event.target.closest('[data-admin-v2-notification-panel]')) {
                adminV2ErtesitesekBezarasa();
            }
        });

        tartalom.addEventListener('keydown', event => {
            if (event.key === 'Escape') adminV2ErtesitesekBezarasa();
        });
    }

    function adminV2AdatFigyelokKapcsolasa() {
        let idozito = null;
        const frissites = () => {
            window.clearTimeout(idozito);
            idozito = window.setTimeout(() => {
                adminV2AttekintesFrissitese();
                adminV2KommunikacioFrissitese();
            }, 40);
        };

        ['admin-foglalas-lista', 'admin-esemenynaplo-lista'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) new MutationObserver(frissites).observe(elem, { childList: true, subtree: true });
        });
    }

    function adminV2MenuGesztusokKapcsolasa(body) {
        let pointerKezdet = null;
        let touchKezdet = null;

        const gesztusKezdese = (x, y, azonosito) => {
            if (!window.matchMedia('(max-width: 900px)').matches) return null;

            const menuNyitva = body.classList.contains('admin-v2-menu-open');
            if (!menuNyitva && x > 112) return null;

            return { x, y, azonosito, menuNyitva };
        };

        const gesztusBefejezese = (kezdet, x, y) => {
            if (!kezdet) return;
            const xEltolas = x - kezdet.x;
            const yEltolas = y - kezdet.y;
            const vizszintesGesztus = Math.abs(xEltolas) >= 56
                && Math.abs(xEltolas) > Math.abs(yEltolas) * 1.2;

            if (vizszintesGesztus && !kezdet.menuNyitva && xEltolas > 0) adminV2MenuNyitasa();
            if (vizszintesGesztus && kezdet.menuNyitva && xEltolas < 0) adminV2MenuBezarasa();
        };

        body.addEventListener('touchstart', event => {
            if (event.touches.length !== 1) return;
            const touch = event.touches[0];
            touchKezdet = gesztusKezdese(touch.clientX, touch.clientY, touch.identifier);
        }, { passive: true });

        body.addEventListener('touchend', event => {
            if (!touchKezdet) return;
            const touch = Array.from(event.changedTouches)
                .find(item => item.identifier === touchKezdet.azonosito);
            if (touch) gesztusBefejezese(touchKezdet, touch.clientX, touch.clientY);
            touchKezdet = null;
        }, { passive: true });

        body.addEventListener('touchcancel', () => {
            touchKezdet = null;
        }, { passive: true });

        body.addEventListener('pointerdown', event => {
            if (event.pointerType !== 'touch') return;
            pointerKezdet = gesztusKezdese(event.clientX, event.clientY, event.pointerId);
        }, { passive: true });

        body.addEventListener('pointerup', event => {
            if (!pointerKezdet || event.pointerId !== pointerKezdet.azonosito) return;
            gesztusBefejezese(pointerKezdet, event.clientX, event.clientY);
            pointerKezdet = null;
        }, { passive: true });

        body.addEventListener('pointercancel', () => {
            pointerKezdet = null;
        }, { passive: true });
    }

    function adminV2ErtesitesAdatok(aktivFoglalasok = null) {
        const foglalasok = aktivFoglalasok || allapot.foglalasElemek
            .filter(item => item.tipus === 'booking')
            .map(item => item.adat)
            .filter(item => !['cancelled', 'cancelled_by_customer'].includes(item.status));
        const pending = foglalasok.filter(item => item.status === 'pending');
        const emailErrors = adminV2EmailHibasEsemenyek();
        const cancellations = adminV2OlvasatlanLemondasok();
        const items = [];

        if (pending.length) {
            items.push({
                tipus: 'pending',
                icon: 'clock',
                tone: 'warning',
                title: pending.length + ' megerősítésre vár',
                description: pending.slice(0, 2).map(item => item.customer_name).join(', ')
            });
        }
        if (cancellations.length) {
            items.push({
                tipus: 'cancellations',
                icon: 'alert',
                tone: 'info',
                title: cancellations.length + ' új vendéglemondás',
                description: 'A lemondott időpontok átnézésre várnak.'
            });
        }
        if (emailErrors.length) {
            items.push({
                tipus: 'email',
                icon: 'mail',
                tone: 'danger',
                title: emailErrors.length + ' emailhiba',
                description: 'Ellenőrizd a sikertelen emailküldéseket.'
            });
        }

        return {
            pending,
            emailErrors,
            cancellations,
            items,
            total: pending.length + emailErrors.length + cancellations.length
        };
    }

    function adminV2ErtesitesekFrissitese(adatok = adminV2ErtesitesAdatok()) {
        document.querySelectorAll('[data-admin-v2-email-alert]:not([data-admin-v2-notification-alert])').forEach(element => {
            element.hidden = adatok.emailErrors.length === 0;
        });
        document.querySelectorAll('[data-admin-v2-notification-alert]').forEach(element => {
            element.hidden = adatok.total === 0;
        });

        const summary = document.querySelector('[data-admin-v2-notification-summary]');
        const list = document.querySelector('[data-admin-v2-notification-list]');
        if (summary) {
            summary.textContent = adatok.total
                ? adatok.total + ' nyitott teendő'
                : 'Minden rendezve';
        }
        if (!list) return;
        if (!adatok.items.length) {
            list.innerHTML = '<li class="admin-v2-empty">Nincs új értesítés.</li>';
            return;
        }

        list.innerHTML = adatok.items.map(item =>
            '<li><button type="button" data-admin-v2-notification-target="' + attr(item.tipus) + '" aria-label="' + attr(item.title) + '">' +
                '<span class="admin-v2-notification-icon admin-v2-tone-' + attr(item.tone) + '">' + adminV2Ikon(item.icon) + '</span>' +
                '<span><strong>' + html(item.title) + '</strong><small>' + html(item.description) + '</small></span>' +
                adminV2Ikon('arrow') +
            '</button></li>'
        ).join('');
    }

    function adminV2ErtesitesekValtasa() {
        const panel = document.querySelector('[data-admin-v2-notification-panel]');
        const button = document.querySelector('[data-admin-v2-notifications-toggle]');
        if (!panel || !button) return;

        const nyitva = panel.hidden;
        if (nyitva) adminV2ErtesitesekFrissitese();
        panel.hidden = !nyitva;
        button.setAttribute('aria-expanded', String(nyitva));
    }

    function adminV2ErtesitesekBezarasa() {
        const panel = document.querySelector('[data-admin-v2-notification-panel]');
        const button = document.querySelector('[data-admin-v2-notifications-toggle]');
        if (panel) panel.hidden = true;
        if (button) button.setAttribute('aria-expanded', 'false');
    }

    function adminV2ErtesitesMegnyitasa(tipus) {
        adminV2ErtesitesekBezarasa();
        if (tipus === 'pending') {
            adminV2Valtas('foglalasok');
            const elemek = adminElemek();
            allapot.foglalasKereses = '';
            allapot.foglalasStatuszSzuro = 'pending';
            allapot.foglalasOldal = 1;
            if (elemek.foglalasKereses) elemek.foglalasKereses.value = '';
            if (elemek.foglalasStatuszSzuro) elemek.foglalasStatuszSzuro.value = 'pending';
            foglalasKeresesTorlesGombFrissitese(elemek);
            foglalasListaRenderelese();
            foglalasNezetValtasa('lista');
            return;
        }
        if (tipus === 'cancellations') {
            adminV2Valtas('foglalasok');
            vendegLemondasokMegnyitasa();
            return;
        }
        if (tipus === 'email') adminV2Valtas('esemenynaplo', 'kommunikacio');
    }

    function adminV2CsoportMegnyitasa(group) {
        const defaultTabs = {
            attekintes: 'attekintes',
            foglalasok: 'foglalasok',
            vendegek: 'vendegek',
            munkaido: 'idosavok',
            weboldal: 'szovegek',
            kommunikacio: 'esemenynaplo',
            beallitasok: 'beallitasok'
        };
        adminV2Valtas(defaultTabs[group] || 'attekintes', group);
    }

    function adminV2Valtas(tab, forcedGroup = '') {
        if (!document.getElementById(`admin-panel-${tab}`)) {
            return;
        }

        adminTabValtas(tab);
        const group = forcedGroup || ADMIN_V2_TAB_GROUPS[tab] || tab;
        document.body.dataset.adminV2Group = group;
        document.body.dataset.adminV2Tab = tab;

        document.querySelectorAll('[data-admin-v2-nav]').forEach(button => {
            const active = button.dataset.adminV2Nav === group;
            button.classList.toggle('is-active', active);
            if (button.classList.contains('admin-v2-nav-item')) {
                button.setAttribute('aria-current', active ? 'page' : 'false');
            }
        });

        document.querySelectorAll('.admin-v2-subnav [data-admin-v2-panel]').forEach(button => {
            button.classList.toggle('is-active', button.dataset.adminV2Panel === tab);
        });

        const label = document.querySelector('[data-admin-v2-current-label]');
        const groupLabels = {
            attekintes: 'Áttekintés',
            foglalasok: 'Időpontok',
            vendegek: 'Regisztrált tagok',
            munkaido: 'Munkaidő',
            weboldal: 'Weboldal',
            kommunikacio: 'Kommunikáció',
            beallitasok: 'Beállítások'
        };
        if (label) label.textContent = groupLabels[group] || 'Admin';

        adminV2MenuBezarasa();
        adminV2ErtesitesekBezarasa();
        if (tab === 'attekintes') adminV2AttekintesFrissitese();
        if (tab === 'vendegek') vendegProfilokBetoltese();
        if (tab === 'esemenynaplo') adminV2KommunikacioFrissitese();

        document.querySelector('.admin-workspace-main')?.scrollTo?.({ top: 0, behavior: 'auto' });
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    function adminV2FoglalasNezetBeallitasa(nezet) {
        window.setTimeout(() => {
            const button = document.querySelector(`[data-foglalas-nezet="${nezet}"]`);
            button?.click();
        }, 0);
    }

    function adminV2FoglalasKeresese(kereses) {
        adminV2Valtas('foglalasok');
        const input = adminElemek().foglalasKereses;
        if (!input) return;
        input.value = kereses || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    }

    function adminV2EmailSablonokMegnyitasa() {
        adminV2Valtas('szovegek', 'kommunikacio');
        let probalkozas = 0;
        const megnyitas = () => {
            const emailTab = Array.from(document.querySelectorAll('.cms-view-tab'))
                .find(button => button.textContent.trim().startsWith('E-mailek'));
            if (emailTab) {
                emailTab.click();
                return;
            }
            probalkozas += 1;
            if (probalkozas < 10) window.setTimeout(megnyitas, 80);
        };
        megnyitas();
    }

    async function adminV2AttekintesFrissitese() {
        const panel = document.getElementById('admin-panel-attekintes');
        if (!panel) return;

        const now = new Date();
        const todayKey = adminV2DatumKulcs(now);
        const bookings = allapot.foglalasElemek
            .filter(item => item.tipus === 'booking')
            .map(item => item.adat);
        const activeBookings = bookings.filter(item => !['cancelled', 'cancelled_by_customer'].includes(item.status));
        const activeSchedule = allapot.foglalasElemek
            .map(adminV2AttekintesIdopont)
            .filter(Boolean);
        const today = activeSchedule
            .filter(item => adminV2DatumKulcs(new Date(item.starts_at)) === todayKey)
            .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
        const upcoming = activeSchedule
            .filter(item => new Date(item.starts_at) > now)
            .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
            .slice(0, 5);
        const notificationData = adminV2ErtesitesAdatok(activeBookings);
        const { pending, emailErrors, cancellations } = notificationData;

        adminV2Text('admin-v2-stat-today', String(today.length));
        adminV2Text('admin-v2-stat-today-meta', `${adminV2OsszesIdotartam(today)} óra lefoglalva`);
        adminV2Text('admin-v2-stat-pending', String(pending.length));
        adminV2Text('admin-v2-stat-pending-meta', pending.length ? 'Átnézésre és megerősítésre vár' : 'Nincs függő foglalás');
        adminV2Text('admin-v2-stat-email', String(emailErrors.length));
        adminV2Text('admin-v2-stat-email-meta', emailErrors.length ? 'A kommunikációs naplóban ellenőrizhető' : 'Nincs ismert emailhiba');

        document.querySelectorAll('[data-admin-v2-pending-count]').forEach(element => {
            element.textContent = String(pending.length);
            element.hidden = pending.length === 0;
        });
        adminV2ErtesitesekFrissitese(notificationData);

        const summary = panel.querySelector('[data-admin-v2-today-summary]');
        if (summary) summary.textContent = today.length ? `${today.length} időpont · ${adminV2NapiIdosav(today)}` : 'Ma nincs aktív foglalás';
        adminV2NapiListaRenderelese(today);
        adminV2KovetkezoListaRenderelese(upcoming);
        adminV2TeendoListaRenderelese(pending, emailErrors, cancellations);
        await adminV2HorizonFrissitese(todayKey);
    }

    function adminV2AttekintesIdopont(item) {
        const data = item?.adat || {};

        if (item?.tipus === 'booking') {
            const status = String(data.status || 'pending').toLowerCase();
            if (['cancelled', 'cancelled_by_customer'].includes(status)) return null;

            return {
                tipus: 'booking',
                cim: data.customer_name || 'Névtelen vendég',
                leiras: data.services?.name || 'Törölt szolgáltatás',
                kereses: data.customer_name || data.public_reference || '',
                starts_at: data.starts_at,
                ends_at: data.ends_at,
                status
            };
        }

        if (item?.tipus === 'blocked') {
            const status = tiltasStatuszErtek(data.status);
            if (['done', 'cancelled_by_customer'].includes(status)) return null;

            const cim = data.reason?.trim() || 'Kézzel felvett idő';
            return {
                tipus: 'blocked',
                cim,
                leiras: 'Kézzel felvett idő',
                kereses: cim,
                starts_at: data.starts_at,
                ends_at: data.ends_at,
                status
            };
        }

        return null;
    }

    function adminV2NapiListaRenderelese(items) {
        const list = document.querySelector('[data-admin-v2-today-list]');
        if (!list) return;

        if (!items.length) {
            list.innerHTML = '<li class="admin-v2-empty">A mai napra nincs aktív foglalás.</li>';
            return;
        }

        list.innerHTML = items.map(item => `
            <li class="admin-v2-schedule-item">
                <span class="admin-v2-schedule-time"><strong>${html(idoInputErtek(item.starts_at))}</strong><small>${html(idoInputErtek(item.ends_at))}</small></span>
                <span class="admin-v2-schedule-line admin-v2-tone-${adminV2StatuszTone(item.status)}"></span>
                <span class="admin-v2-schedule-copy"><strong>${html(item.cim)}</strong><small>${html(item.leiras)}</small></span>
                <button type="button" class="admin-v2-status-chip admin-v2-tone-${adminV2StatuszTone(item.status)}" data-admin-v2-booking-search="${attr(item.kereses)}">${html(adminV2StatuszFelirat(item.status))}</button>
            </li>
        `).join('');
    }

    function adminV2KovetkezoListaRenderelese(items) {
        const list = document.querySelector('[data-admin-v2-upcoming-list]');
        if (!list) return;

        if (!items.length) {
            list.innerHTML = '<li class="admin-v2-empty">Nincs közelgő foglalás.</li>';
            return;
        }

        list.innerHTML = items.map(item => `
            <li>
                <button type="button" data-admin-v2-booking-search="${attr(item.kereses)}">
                    <span><strong>${html(item.cim)}</strong><small>${html(item.leiras)}</small></span>
                    <span><strong>${html(adminV2RovidDatum(item.starts_at))}</strong><small>${html(idoInputErtek(item.starts_at))}</small></span>
                </button>
            </li>
        `).join('');
    }

    function adminV2TeendoListaRenderelese(pending, emailErrors, cancellations) {
        const list = document.querySelector('[data-admin-v2-task-list]');
        const summary = document.querySelector('[data-admin-v2-task-summary]');
        if (!list) return;

        const tasks = [];
        if (pending.length) {
            tasks.push({
                icon: 'clock',
                tone: 'warning',
                title: `${pending.length} foglalás megerősítésre vár`,
                description: pending.slice(0, 2).map(item => item.customer_name).join(', '),
                panel: 'foglalasok',
                action: 'Megnyitás'
            });
        }
        if (emailErrors.length) {
            tasks.push({
                icon: 'mail',
                tone: 'danger',
                title: `${emailErrors.length} emailhiba a naplóban`,
                description: 'Ellenőrizd a legutóbbi küldési eseményeket.',
                panel: 'esemenynaplo',
                action: 'Részletek'
            });
        }
        if (cancellations.length) {
            tasks.push({
                icon: 'alert',
                tone: 'info',
                title: `${cancellations.length} új vendéglemondás`,
                description: 'A felszabadult időpontok már újra foglalhatók.',
                panel: 'foglalasok',
                action: 'Átnézés'
            });
        }

        if (summary) summary.textContent = tasks.length ? `${tasks.length} figyelmet igénylő terület` : 'Minden fontos feladat rendezve';
        if (!tasks.length) {
            list.innerHTML = '<li class="admin-v2-empty">Nincs azonnali teendő.</li>';
            return;
        }

        list.innerHTML = tasks.map(task => `
            <li class="admin-v2-task-item">
                <span class="admin-v2-task-icon admin-v2-tone-${task.tone}">${adminV2Ikon(task.icon)}</span>
                <span><strong>${html(task.title)}</strong><small>${html(task.description)}</small></span>
                <button type="button" data-admin-v2-panel="${task.panel}">${task.action}</button>
            </li>
        `).join('');
    }

    async function adminV2HorizonFrissitese(todayKey) {
        const value = document.getElementById('admin-v2-stat-horizon');
        const meta = document.getElementById('admin-v2-stat-horizon-meta');
        if (!value || !meta || !allapot.kliens) return;

        try {
            let query = allapot.kliens
                .from('availability_windows')
                .select('work_date')
                .eq('active', true);
            if (typeof query.gte === 'function') query = query.gte('work_date', todayKey);
            query = query.order('work_date', { ascending: false }).limit(1);
            const { data, error } = await query;
            if (error || !data?.length) {
                value.textContent = '—';
                meta.textContent = 'Nincs jövőbeli foglalható nap';
                return;
            }

            const lastDate = new Date(`${data[0].work_date}T12:00:00`);
            const today = new Date(`${todayKey}T12:00:00`);
            const days = Math.max(0, Math.round((lastDate - today) / 86400000));
            value.textContent = `${days} nap`;
            meta.textContent = `${new Intl.DateTimeFormat('hu-HU', { month: 'long', day: 'numeric' }).format(lastDate)} napjáig`;
        } catch (error) {
            value.textContent = '—';
            meta.textContent = 'A foglalható időszak nem olvasható';
        }
    }

    function adminV2KommunikacioFrissitese() {
        const events = Array.isArray(allapot.esemenynaploElemek) ? allapot.esemenynaploElemek : [];
        const todayKey = adminV2DatumKulcs(new Date());
        const emailEvents = events.filter(event => String(event.channel || '').toLowerCase() === 'email');
        const todayEvents = emailEvents.filter(event => adminV2DatumKulcs(new Date(event.created_at)) === todayKey);
        const failed = adminV2EmailHibasEsemenyek();
        const success = emailEvents.filter(event => ['success', 'sent', 'ok'].includes(String(event.status || '').toLowerCase()));

        adminV2Text('admin-v2-email-today', String(todayEvents.length));
        adminV2Text('admin-v2-email-success', String(success.length));
        adminV2Text('admin-v2-email-failed', String(failed.length));
        adminV2Text('admin-v2-email-last-error', failed.length ? adminV2RovidDatumIdo(failed[0].created_at) : 'Nincs');

        const acknowledgeButton = document.querySelector('[data-admin-v2-ack-email-errors]');
        const acknowledgeSummary = document.querySelector('[data-admin-v2-email-ack-summary]');
        if (acknowledgeButton) acknowledgeButton.hidden = failed.length === 0;
        if (acknowledgeSummary) {
            acknowledgeSummary.textContent = failed.length
                ? `${failed.length} emailhiba átnézésre vár.`
                : 'Nincs nyitott emailhiba.';
        }
        adminV2ErtesitesekFrissitese();
    }

    function adminV2EmailHibasEsemenyek() {
        const events = Array.isArray(allapot.esemenynaploElemek) ? allapot.esemenynaploElemek : [];
        const acknowledgedIds = new Set();
        let acknowledgedThrough = 0;

        events
            .filter(event => event.event_type === 'admin_email_errors_acknowledged')
            .forEach(event => {
                const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata : {};
                const through = Date.parse(metadata.acknowledged_through || event.created_at || '');
                if (Number.isFinite(through)) acknowledgedThrough = Math.max(acknowledgedThrough, through);
                if (Array.isArray(metadata.acknowledged_event_ids)) {
                    metadata.acknowledged_event_ids.forEach(id => acknowledgedIds.add(String(id)));
                }
            });

        return events
            .filter(event => String(event.channel || '').toLowerCase() === 'email')
            .filter(adminV2EsemenyHibas)
            .filter(event => {
                if (event.id && acknowledgedIds.has(String(event.id))) return false;
                const createdAt = Date.parse(event.created_at || '');
                return !acknowledgedThrough || !Number.isFinite(createdAt) || createdAt > acknowledgedThrough;
            });
    }

    async function adminV2EmailHibakNyugtazasa(button) {
        const errors = adminV2EmailHibasEsemenyek();
        if (!errors.length) {
            adminV2KommunikacioFrissitese();
            return;
        }

        const validErrors = errors
            .filter(event => Number.isFinite(Date.parse(event.created_at || '')))
            .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
        const acknowledgedThrough = validErrors[0]?.created_at || new Date().toISOString();
        const payload = {
            booking_id: null,
            event_type: 'admin_email_errors_acknowledged',
            channel: 'admin',
            status: 'success',
            title: 'Emailhibák nyugtázva',
            message: `Az admin ${errors.length} emailhibát átnézett és nyugtázott.`,
            metadata: {
                acknowledged_count: errors.length,
                acknowledged_through: acknowledgedThrough,
                acknowledged_event_ids: errors.map(event => event.id).filter(Boolean)
            }
        };

        button.disabled = true;
        onlineStatusz('Emailhibák nyugtázásának mentése...');

        try {
            const { data, error } = await allapot.kliens
                .from('booking_events')
                .insert(payload)
                .select('id,booking_id,event_type,channel,status,title,message,metadata,created_at')
                .single();

            if (error || !data) {
                onlineStatusz('Az emailhibák nyugtázását nem sikerült elmenteni. Próbáld újra.', true);
                return;
            }

            allapot.esemenynaploElemek = [
                data,
                ...allapot.esemenynaploElemek.filter(event => event.id !== data.id)
            ];
            esemenynaploRenderelese();
            await adminV2AttekintesFrissitese();
            adminV2KommunikacioFrissitese();
            onlineStatusz(`${errors.length} emailhiba nyugtázva.`);
        } catch (error) {
            console.warn('Emailhibák nyugtázása nem sikerült:', error);
            onlineStatusz('Az emailhibák nyugtázását nem sikerült elmenteni. Próbáld újra.', true);
        } finally {
            if (button.isConnected) button.disabled = false;
        }
    }

    function adminV2EsemenyHibas(event) {
        return ['error', 'failed', 'failure'].includes(String(event.status || '').toLowerCase());
    }

    function adminV2OlvasatlanLemondasok() {
        try {
            return vendegLemondasOlvasatlanFoglalasok();
        } catch (error) {
            return [];
        }
    }

    function adminV2OsszesIdotartam(items) {
        const minutes = items.reduce((sum, item) => {
            const start = new Date(item.starts_at);
            const end = new Date(item.ends_at);
            const duration = Math.max(0, Math.round((end - start) / 60000));
            return sum + duration;
        }, 0);
        const hours = minutes / 60;
        return Number.isInteger(hours) ? String(hours) : String(hours.toFixed(1)).replace('.', ',');
    }

    function adminV2NapiIdosav(items) {
        if (!items.length) return '';
        return `${idoInputErtek(items[0].starts_at)}–${idoInputErtek(items[items.length - 1].ends_at)}`;
    }

    function adminV2StatuszFelirat(status) {
        return {
            pending: 'Megerősítésre vár',
            confirmed: 'Megerősítve',
            blocked: 'Foglalt',
            done: 'Teljesítve',
            cancelled: 'Lemondva',
            cancelled_by_customer: 'Vendég lemondta'
        }[status] || 'Foglalás';
    }

    function adminV2StatuszTone(status) {
        return {
            pending: 'warning',
            confirmed: 'success',
            done: 'muted',
            cancelled: 'danger',
            cancelled_by_customer: 'danger'
        }[status] || 'info';
    }

    function adminV2DatumKulcs(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function adminV2RovidDatum(value) {
        const date = new Date(value);
        return new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' }).format(date);
    }

    function adminV2RovidDatumIdo(value) {
        const date = new Date(value);
        return new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    }

    function adminV2MaiDatumFelirat() {
        return new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        }).format(new Date());
    }

    function adminV2Text(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function adminV2MenuNyitasa() {
        document.body.classList.add('admin-v2-menu-open');
        document.querySelector('[data-admin-v2-menu]')?.setAttribute('aria-expanded', 'true');
    }

    function adminV2MenuBezarasa() {
        document.body.classList.remove('admin-v2-menu-open');
        document.querySelector('[data-admin-v2-menu]')?.setAttribute('aria-expanded', 'false');
    }

    function adminV2Ikon(name) {
        const paths = {
            overview: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"></path>',
            calendar: '<path d="M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z"></path>',
            users: '<circle cx="9" cy="9" r="3"></circle><circle cx="17" cy="10" r="2.5"></circle><path d="M3.5 20v-2a4.5 4.5 0 0 1 9 0v2M14 15.5a4 4 0 0 1 6.5 3.1V20"></path>',
            clock: '<circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path>',
            website: '<path d="M4 5h16v14H4zM4 9h16M8 5v4"></path>',
            mail: '<path d="M4 6h16v12H4zM4 7l8 6 8-6"></path>',
            settings: '<circle cx="12" cy="12" r="3"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"></path>',
            arrow: '<path d="m9 6 6 6-6 6"></path>',
            menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
            bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"></path>',
            refresh: '<path d="M20 6v5h-5M4 18v-5h5M6.1 9a7 7 0 0 1 11.7-2.6L20 11M4 13l2.2 4.6A7 7 0 0 0 17.9 15"></path>',
            plus: '<path d="M12 5v14M5 12h14"></path>',
            check: '<path d="m5 12 4 4L19 6"></path>',
            edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"></path>',
            close: '<path d="M6 6l12 12M18 6 6 18"></path>',
            up: '<path d="m6 15 6-6 6 6"></path>',
            down: '<path d="m6 9 6 6 6-6"></path>',
            trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path>',
            alert: '<path d="M12 4 3 20h18zM12 9v5M12 17h.01"></path>'
        };
        return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.arrow}</svg>`;
    }

// Small admin copy overrides that should remain independent from workspace structure.

ADMIN_V2_PAGE_COPY.szolgaltatasok.title = 'Árlista';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arlistaFeliratokFrissitese);
} else {
    arlistaFeliratokFrissitese();
}

function arlistaFeliratokFrissitese() {
    window.requestAnimationFrame(() => {
        document.querySelectorAll('.admin-v2-subnav [data-admin-v2-panel="szolgaltatasok"]').forEach(gomb => {
            gomb.textContent = 'Árlista';
        });
    });
}

    async function foglalasokBetoltese() {
        const elemek = adminElemek();
        onlineStatusz('Foglalások betöltése...');

        const alapSelect = 'id,customer_name,customer_phone,customer_email,note,starts_at,ends_at,status,created_at,services(name,price_text)';
        const kuponSelect = 'id,customer_name,customer_phone,customer_email,note,starts_at,ends_at,status,created_at,coupon_code,coupon_title,services(name,price_text)';
        const inspiracioSelect = 'id,customer_name,customer_phone,customer_email,note,starts_at,ends_at,status,created_at,coupon_code,coupon_title,inspiration_image_url,inspiration_image_path,inspiration_image_name,inspiration_image_type,inspiration_image_size,inspiration_images,nail_style,nail_style_note,services(name,price_text)';
        let { data: foglalasok, error: foglalasHiba } = await allapot.kliens
            .from('bookings')
            .select(inspiracioSelect)
            .order('starts_at', { ascending: false })
            .limit(ADMIN_FOGLALAS_LIMIT);

        if (foglalasHiba && hianyzoInspiracioOszlop(foglalasHiba)) {
            ({ data: foglalasok, error: foglalasHiba } = await allapot.kliens
                .from('bookings')
                .select(kuponSelect)
                .order('starts_at', { ascending: false })
                .limit(ADMIN_FOGLALAS_LIMIT));
        }

        if (foglalasHiba && hianyzoKuponOszlop(foglalasHiba)) {
            ({ data: foglalasok, error: foglalasHiba } = await allapot.kliens
                .from('bookings')
                .select(alapSelect)
                .order('starts_at', { ascending: false })
                .limit(ADMIN_FOGLALAS_LIMIT));
        }
        if (!foglalasHiba && Array.isArray(foglalasok) && foglalasok.length) {
            const { data: referenciaAdatok, error: referenciaHiba } = await allapot.kliens
                .from('bookings')
                .select('id,public_reference,starts_at')
                .order('starts_at', { ascending: false })
                .limit(ADMIN_FOGLALAS_LIMIT);

            if (!referenciaHiba) {
                const referenciaMap = new Map((referenciaAdatok || []).map(adat => [adat.id, adat.public_reference]));
                foglalasok = foglalasok.map(foglalas => ({
                    ...foglalas,
                    public_reference: referenciaMap.get(foglalas.id) || ''
                }));
            } else if (!adatbazisOszlopHiany(referenciaHiba, ['public_reference'])) {
                console.warn('Foglalási azonosítók betöltési hiba:', referenciaHiba);
            }
        }

        let { data: tiltasok, error: tiltasHiba } = await allapot.kliens
            .from('blocked_times')
            .select('id,starts_at,ends_at,reason,status,created_at')
            .order('starts_at', { ascending: false })
            .limit(ADMIN_FOGLALAS_LIMIT);

        if (tiltasHiba && adatbazisOszlopHiany(tiltasHiba, ['status'])) {
            allapot.tiltasStatuszTamogatott = false;
            ({ data: tiltasok, error: tiltasHiba } = await allapot.kliens
                .from('blocked_times')
                .select('id,starts_at,ends_at,reason,created_at')
                .order('starts_at', { ascending: false })
                .limit(ADMIN_FOGLALAS_LIMIT));
        } else if (!tiltasHiba) {
            allapot.tiltasStatuszTamogatott = true;
        }

        if (foglalasHiba || tiltasHiba) {
            onlineStatusz('Nem sikerült betölteni a foglalásokat.', true);
            return;
        }

        foglalasok = await foglalasInspiracioLinkekAlairasa(foglalasok || []);

        allapot.foglalasElemek = [
            ...(foglalasok || []).map(foglalas => ({ tipus: 'booking', datum: foglalas.starts_at, adat: foglalas })),
            ...(tiltasok || []).map(tiltas => ({
                tipus: 'blocked',
                datum: tiltas.starts_at,
                adat: { ...tiltas, status: tiltasStatuszErtek(tiltas.status) }
            }))
        ].sort((a, b) => new Date(b.datum) - new Date(a.datum));

        await vendegLemondasEsemenyekBetoltese();

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

    function hianyzoKuponOszlop(error) {
        const uzenet = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return uzenet.includes('coupon_code') || uzenet.includes('coupon_title') || uzenet.includes('column') && uzenet.includes('schema cache');
    }

    function adatbazisOszlopHiany(error, oszlopok = []) {
        const uzenet = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return oszlopok.some(oszlop => uzenet.includes(oszlop.toLowerCase())) || uzenet.includes('schema cache') && uzenet.includes('column');
    }

    function hianyzoKuponTabla(error) {
        const uzenet = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
        return uzenet.includes('coupons') || uzenet.includes('schema cache') || uzenet.includes('does not exist');
    }
    function foglalasListaRenderelese() {
        const elemek = adminElemek();
        const szurtElemek = foglalasSzurtElemek();
        const meret = listaOldalMeret(allapot.foglalasOldalMeret, szurtElemek.length);
        const kezd = allapot.foglalasOldalMeret === 'all' ? 0 : (allapot.foglalasOldal - 1) * meret;
        const oldalElemek = allapot.foglalasOldalMeret === 'all'
            ? szurtElemek
            : szurtElemek.slice(kezd, kezd + meret);

        elemek.foglalasLista.innerHTML = '';
        foglalasAttekintesFrissitese(szurtElemek);
        foglalasNaptarRenderelese(szurtElemek);

        if (!oldalElemek.length) {
            const aktivSzuro = Boolean(allapot.foglalasKereses) || (allapot.foglalasStatuszSzuro || 'all') !== 'all';
            elemek.foglalasLista.innerHTML = aktivSzuro
                ? '<p class="admin-ures">Nincs tal\u00e1lat erre a sz\u0171r\u00e9sre.</p>'
                : '<p class="admin-ures">M\u00e9g nincs foglal\u00e1s vagy k\u00e9zzel felvett foglalt id\u0151.</p>';
            foglalasLapozoRenderelese();
            foglalasTabJelzesFrissitese();
            return;
        }

        oldalElemek.forEach(elem => {
            elemek.foglalasLista.appendChild(elem.tipus === 'blocked'
                ? tiltasFoglalasKartya(elem.adat)
                : foglalasKartya(elem.adat));
        });

        foglalasLapozoRenderelese();
        foglalasTabJelzesFrissitese();
    }

    function aktualisFoglalasExportAdatok() {
        if (allapot.foglalasNezet === 'naptar') {
            return foglalasNaptarHonapElemei()
                .map(elem => ({ ...elem.adat, __tipus: elem.tipus }));
        }

        return aktualisListaOldal(
            foglalasSzurtElemek(),
            allapot.foglalasOldal,
            allapot.foglalasOldalMeret
        ).map(elem => ({ ...elem.adat, __tipus: elem.tipus }));
    }

    function foglalasSzurtElemek() {
        const kereses = normalizaltKereses(allapot.foglalasKereses);
        const telefonKereses = csakSzamok(allapot.foglalasKereses);
        const statuszSzuro = allapot.foglalasStatuszSzuro || 'all';

        if (!kereses && !telefonKereses && statuszSzuro === 'all') {
            return allapot.foglalasElemek;
        }

        return allapot.foglalasElemek.filter(elem => {
            const adat = elem.adat || {};
            const statusz = String(adat.status || '').toLowerCase();
            const statuszTalalat = statuszSzuro === 'all'
                || statuszSzuro === 'blocked' && elem.tipus === 'blocked' && statusz === 'blocked'
                || statuszSzuro === 'blocked_all' && elem.tipus === 'blocked'
                || statuszSzuro === 'done' && statusz === 'done'
                || statuszSzuro === 'cancelled_by_customer' && statusz === 'cancelled_by_customer'
                || elem.tipus === 'booking' && statusz === statuszSzuro;

            if (!statuszTalalat) {
                return false;
            }

            if (!kereses && !telefonKereses) {
                return true;
            }

            const szolgaltatasNev = adat.services?.description || adat.services?.name || '';
            const szovegek = [
                adat.customer_name,
                adat.customer_email,
                adat.customer_phone,
                adat.public_reference,
                adat.id,
                adat.note,
                adat.nail_style,
                vendegLemondasMegjegyzese(adat),
                adat.reason,
                szolgaltatasNev,
                elem.tipus === 'blocked' ? 'k\u00e9zzel felvett foglalt id\u0151' : 'foglal\u00e1s'
            ];
            const szovegTalalat = normalizaltKereses(szovegek.filter(Boolean).join(' ')).includes(kereses);
            const telefonTalalat = telefonKereses && csakSzamok([adat.customer_phone, adat.customer_name, adat.customer_email].filter(Boolean).join(' ')).includes(telefonKereses);
            return szovegTalalat || telefonTalalat;
        });
    }

    function foglalasFuggoben(foglalas) {
        return String(foglalas?.status || '').toLowerCase() === 'pending';
    }

    function foglalasFuggobenDarab() {
        return allapot.foglalasElemek.filter(elem => elem.tipus === 'booking' && foglalasFuggoben(elem.adat)).length;
    }

    function vendegAltalLemondottFoglalasok() {
        return allapot.foglalasElemek.filter(elem => elem.tipus === 'booking'
            && String(elem.adat?.status || '').toLowerCase() === 'cancelled_by_customer');
    }

    async function vendegLemondasEsemenyekBetoltese() {
        const foglalasIds = vendegAltalLemondottFoglalasok()
            .map(elem => elem.adat?.id)
            .filter(Boolean);

        allapot.lemondasEsemenyek = new Map();

        if (!foglalasIds.length) {
            return;
        }

        const { data, error } = await allapot.kliens
            .from('booking_events')
            .select('booking_id,event_type,message,metadata,created_at')
            .in('booking_id', foglalasIds)
            .in('event_type', ['customer_cancelled', 'customer_cancellation_acknowledged'])
            .order('created_at', { ascending: true });

        if (error) {
            console.warn('Vendéglemondások értesítési állapota nem tölthető be:', error);
            return;
        }

        (data || []).forEach(esemeny => {
            const bookingId = String(esemeny.booking_id || '');
            if (!bookingId) {
                return;
            }

            const allapotAdat = allapot.lemondasEsemenyek.get(bookingId) || {};
            if (esemeny.event_type === 'customer_cancelled') {
                allapotAdat.lemondas = esemeny.created_at;
                allapotAdat.megjegyzes = vendegLemondasMegjegyzesEsemenybol(esemeny);
            }
            if (esemeny.event_type === 'customer_cancellation_acknowledged') {
                allapotAdat.tudomasulvetel = esemeny.created_at;
            }
            allapot.lemondasEsemenyek.set(bookingId, allapotAdat);
        });
    }

    function vendegLemondasMegjegyzesEsemenybol(esemeny) {
        const metadata = esemeny?.metadata;
        const metadataMegjegyzes = metadata && typeof metadata === 'object'
            ? String(metadata.cancellation_note || '').trim()
            : '';

        if (metadataMegjegyzes) {
            return metadataMegjegyzes;
        }

        const uzenet = String(esemeny?.message || '').trim();
        const talalat = uzenet.match(/^Vend[eé]g megjegyz[eé]se:\s*([\s\S]+)$/i);
        return talalat?.[1]?.trim() || '';
    }

    function vendegLemondasMegjegyzese(foglalas) {
        const esemenyek = allapot.lemondasEsemenyek.get(String(foglalas?.id || ''));
        return String(esemenyek?.megjegyzes || '').trim();
    }

    function vendegLemondasOlvasatlan(foglalas) {
        const esemenyek = allapot.lemondasEsemenyek.get(String(foglalas?.id || ''));

        if (!esemenyek?.tudomasulvetel) {
            return true;
        }

        if (!esemenyek.lemondas) {
            return false;
        }

        return Date.parse(esemenyek.lemondas) > Date.parse(esemenyek.tudomasulvetel);
    }

    function vendegLemondasOlvasatlanFoglalasok() {
        return vendegAltalLemondottFoglalasok()
            .map(elem => elem.adat)
            .filter(vendegLemondasOlvasatlan);
    }

    function vendegLemondasJelzesFrissitese() {
        const elemek = adminElemek();
        const darab = vendegLemondasOlvasatlanFoglalasok().length;

        if (!elemek.vendegLemondasJelzes) {
            return;
        }

        elemek.vendegLemondasJelzes.hidden = darab === 0;
        elemek.vendegLemondasDarab.textContent = String(darab);
        elemek.vendegLemondasUzenet.setAttribute('aria-label', darab + ' új vendéglemondás vár arra, hogy átnézd.');
    }

    function vendegLemondasokMegnyitasa() {
        const elemek = adminElemek();
        allapot.foglalasKereses = '';
        allapot.foglalasStatuszSzuro = 'cancelled_by_customer';
        allapot.foglalasOldal = 1;
        elemek.foglalasKereses.value = '';
        foglalasKeresesTorlesGombFrissitese(elemek);
        elemek.foglalasStatuszSzuro.value = 'cancelled_by_customer';
        foglalasListaRenderelese();
        foglalasNezetValtasa('lista');
        elemek.foglalasLista?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function vendegLemondasokTudomasulvetele() {
        const elemek = adminElemek();
        const olvasatlanFoglalasok = vendegLemondasOlvasatlanFoglalasok();

        if (!olvasatlanFoglalasok.length) {
            vendegLemondasJelzesFrissitese();
            return;
        }

        elemek.vendegLemondasTudomasulvetel.disabled = true;
        onlineStatusz('Vendéglemondások tudomásulvételének mentése...');

        const { data, error } = await allapot.kliens
            .from('booking_events')
            .insert(olvasatlanFoglalasok.map(foglalas => ({
                booking_id: foglalas.id,
                event_type: 'customer_cancellation_acknowledged',
                channel: 'admin',
                status: 'success',
                title: 'Vendéglemondás tudomásul véve',
                message: 'Az admin a lemondást átnézte és tudomásul vette.',
                metadata: {}
            })))
            .select('booking_id,created_at');

        if (error) {
            elemek.vendegLemondasTudomasulvetel.disabled = false;
            onlineStatusz('A tudomásulvételt nem sikerült elmenteni. Próbáld újra.', true);
            return;
        }

        const mentettIdopontok = new Map((data || []).map(esemeny => [String(esemeny.booking_id), esemeny.created_at]));
        const most = new Date().toISOString();
        olvasatlanFoglalasok.forEach(foglalas => {
            const bookingId = String(foglalas.id);
            const esemenyek = allapot.lemondasEsemenyek.get(bookingId) || {};
            esemenyek.tudomasulvetel = mentettIdopontok.get(bookingId) || most;
            allapot.lemondasEsemenyek.set(bookingId, esemenyek);
        });

        elemek.vendegLemondasTudomasulvetel.disabled = false;
        vendegLemondasJelzesFrissitese();
        await adminV2AttekintesFrissitese();
        onlineStatusz(olvasatlanFoglalasok.length + ' vendéglemondás tudomásul véve.');
    }

    function foglalasTabJelzesFrissitese() {
        vendegLemondasJelzesFrissitese();
        const tab = document.querySelector('.admin-tab[data-admin-tab="foglalasok"]');

        if (!tab) {
            return;
        }

        const darab = foglalasFuggobenDarab();
        let jelzes = tab.querySelector('.admin-tab-jelzes');

        tab.classList.toggle('admin-tab-jelzes-van', darab > 0);

        if (!darab) {
            jelzes?.remove();
            tab.removeAttribute('aria-label');
            return;
        }

        if (!jelzes) {
            jelzes = document.createElement('span');
            jelzes.className = 'admin-tab-jelzes';
            tab.appendChild(jelzes);
        }

        jelzes.textContent = darab > 99 ? '99+' : String(darab);
        tab.setAttribute('aria-label', `Foglal\u00e1sok, ${darab} f\u00fcgg\u0151ben`);
    }


    function normalizaltKereses(ertek) {
        return String(ertek || '')
            .toLocaleLowerCase('hu-HU')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function csakSzamok(ertek) {
        return String(ertek || '').replace(/\D/g, '');
    }

    function listaOldalMeret(ertek, osszes) {
        if (ertek === 'all') return Math.max(1, osszes || 1);
        const szam = Number.parseInt(ertek, 10);
        return Number.isFinite(szam) && szam > 0 ? szam : 10;
    }

    function oldalmeretGombok(aktiv, adatNev) {
        return `<select class="admin-oldalmeret-select" data-${adatNev} aria-label="Oldalank\u00e9nt">
            ${[10, 20, 'all'].map(ertek => {
                const cimke = ertek === 'all' ? '\u00d6sszes' : String(ertek);
                const aktivE = String(aktiv) === String(ertek);
                return `<option value="${ertek}" ${aktivE ? 'selected' : ''}>${cimke}</option>`;
            }).join('')}
        </select>`;
    }

    function foglalasOsszesOldal() {
        const lista = foglalasSzurtElemek();
        if (allapot.foglalasOldalMeret === 'all') return 1;
        return Math.max(1, Math.ceil(lista.length / listaOldalMeret(allapot.foglalasOldalMeret, lista.length)));
    }

    function foglalasLapozoHtml() {
        const lista = foglalasSzurtElemek();
        const osszes = foglalasOsszesOldal();
        const vanElem = lista.length > 0;
        const oldalSzoveg = vanElem ? `${allapot.foglalasOldal} / ${osszes}` : '0 / 0';
        return `
            <div class="admin-lapozo-nav" role="group" aria-label="Foglalások lapozása">
                <button type="button" class="admin-pagination-button" data-foglalas-oldal="elozo" aria-label="Előző oldal" title="Előző oldal" ${allapot.foglalasOldal <= 1 || !vanElem ? 'disabled' : ''}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"></path></svg>
                    <span>Előző</span>
                </button>
                <span class="admin-pagination-page" aria-label="${html(oldalSzoveg)}">${html(oldalSzoveg)}</span>
                <button type="button" class="admin-pagination-button" data-foglalas-oldal="kovetkezo" aria-label="Következő oldal" title="Következő oldal" ${allapot.foglalasOldal >= osszes || !vanElem ? 'disabled' : ''}>
                    <span>Következő</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"></path></svg>
                </button>
            </div>
            <div class="admin-lapozo-jobb">
                <label class="admin-oldalmeret admin-pagination-size">
                    <span>Oldalanként</span>
                    ${oldalmeretGombok(allapot.foglalasOldalMeret, 'foglalas-oldalmeret')}
                </label>
            </div>
        `;
    }

    function foglalasLapozoRenderelese() {
        const elemek = adminElemek();
        const frissitesGomb = elemek.foglalasFrissites;
        const htmlTartalom = foglalasLapozoHtml();
        [elemek.foglalasLapozoFelso, elemek.foglalasLapozo].filter(Boolean).forEach(lapozo => {
            lapozo.innerHTML = htmlTartalom;
        });

        const felsoJobbOldal = elemek.foglalasLapozoFelso?.querySelector('.admin-lapozo-jobb');
        if (felsoJobbOldal && frissitesGomb) {
            felsoJobbOldal.append(frissitesGomb);
        }
    }

    function foglalasLapozoKattintas(event) {
        const meretValaszto = event.target.closest('[data-foglalas-oldalmeret]');
        if (meretValaszto) {
            if (event.type === 'click' && meretValaszto.tagName === 'SELECT') {
                return;
            }

            const meretErtek = meretValaszto.dataset.foglalasOldalmeret || meretValaszto.value;
            allapot.foglalasOldalMeret = meretErtek === 'all' ? 'all' : Number.parseInt(meretErtek, 10);
            allapot.foglalasOldal = 1;
            foglalasListaRenderelese();
            return;
        }

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
            .select('id,booking_id,event_type,channel,status,title,message,metadata,created_at,bookings(customer_name,customer_email,customer_phone,starts_at)')
            .neq('event_type', 'customer_cancellation_acknowledged')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            elemek.esemenynaploLista.innerHTML = '<p class="admin-ures">Az eseménynapló még nem érhető el. Futtasd a booking_events SQL-t Supabase-ben.</p>';
            return;
        }

        allapot.esemenynaploElemek = Array.isArray(data) ? data : [];
        if (allapot.esemenynaploOldal > esemenynaploOsszesOldal()) {
            allapot.esemenynaploOldal = esemenynaploOsszesOldal();
        }
        esemenynaploRenderelese();
    }

    function esemenynaploRenderelese() {
        const elemek = adminElemek();

        if (!elemek.esemenynaploLista) {
            return;
        }

        elemek.esemenynaploLista.innerHTML = '';

        if (!allapot.esemenynaploElemek.length) {
            elemek.esemenynaploLista.innerHTML = '<p class="admin-ures">M\u00e9g nincs napl\u00f3zott foglal\u00e1si esem\u00e9ny.</p>';
            esemenynaploLapozoRenderelese();
            return;
        }

        const meret = listaOldalMeret(allapot.esemenynaploOldalMeret, allapot.esemenynaploElemek.length);
        const kezd = allapot.esemenynaploOldalMeret === 'all' ? 0 : (allapot.esemenynaploOldal - 1) * meret;
        const oldalElemek = allapot.esemenynaploOldalMeret === 'all'
            ? allapot.esemenynaploElemek
            : allapot.esemenynaploElemek.slice(kezd, kezd + meret);

        oldalElemek.forEach(esemeny => {
            const kartya = document.createElement('article');
            kartya.className = `admin-db-kartya admin-esemeny-kartya admin-esemeny-${html(esemeny.status || 'info')}`;
            const foglalasNev = esemeny.bookings?.customer_name || '';
            const foglalasIdo = esemeny.bookings?.starts_at ? datumIdoRovid(esemeny.bookings.starts_at) : '';

            kartya.innerHTML = `
                <div class="admin-db-kartya-fej">
                    <div>
                        <p class="admin-esemeny-idopont">${html(datumIdoRovid(esemeny.created_at))}</p>
                        <h3>${html(esemeny.title || esemenyTipusFelirat(esemeny.event_type))}</h3>
                    </div>
                    <span class="admin-esemeny-statusz">${html(esemenyStatuszFelirat(esemeny.status))}</span>
                </div>
                <div class="admin-esemeny-reszletek">
                    ${foglalasNev ? `<p><strong>Foglal\u00e1s:</strong> ${html(foglalasNev)}${foglalasIdo ? ` - ${html(foglalasIdo)}` : ''}</p>` : ''}
                    ${esemeny.message ? `<p>${html(esemeny.message)}</p>` : ''}
                    <p class="admin-esemeny-meta">${html([esemeny.channel, esemeny.event_type].filter(Boolean).join(' / '))}</p>
                </div>
            `;

            elemek.esemenynaploLista.appendChild(kartya);
        });

        esemenynaploLapozoRenderelese();
    }

    function aktualisEsemenyExportAdatok() {
        return aktualisListaOldal(
            allapot.esemenynaploElemek,
            allapot.esemenynaploOldal,
            allapot.esemenynaploOldalMeret
        ).map(esemeny => ({ ...esemeny }));
    }

    function aktualisListaOldal(lista, oldal, oldalMeret) {
        if (oldalMeret === 'all') {
            return lista.slice();
        }

        const meret = listaOldalMeret(oldalMeret, lista.length);
        const kezd = Math.max(0, (oldal - 1) * meret);
        return lista.slice(kezd, kezd + meret);
    }

    function esemenynaploOsszesOldal() {
        if (allapot.esemenynaploOldalMeret === 'all') return 1;
        return Math.max(1, Math.ceil(allapot.esemenynaploElemek.length / listaOldalMeret(allapot.esemenynaploOldalMeret, allapot.esemenynaploElemek.length)));
    }

    function esemenynaploLapozoHtml() {
        const osszes = esemenynaploOsszesOldal();
        const vanElem = allapot.esemenynaploElemek.length > 0;
        return `
            <div class="admin-oldalmeret" role="group" aria-label="Esem\u00e9nynapl\u00f3 oldalank\u00e9nt">
                <span>Oldalank\u00e9nt</span>
                ${oldalmeretGombok(allapot.esemenynaploOldalMeret, 'esemenynaplo-oldalmeret')}
            </div>
            <button type="button" class="admin-kis-gomb" data-esemenynaplo-oldal="elozo" ${allapot.esemenynaploOldal <= 1 || !vanElem ? 'disabled' : ''}>El\u0151z\u0151</button>
            <span>${vanElem ? `${allapot.esemenynaploOldal} / ${osszes}` : '0 / 0'}</span>
            <button type="button" class="admin-kis-gomb" data-esemenynaplo-oldal="kovetkezo" ${allapot.esemenynaploOldal >= osszes || !vanElem ? 'disabled' : ''}>K\u00f6vetkez\u0151</button>
        `;
    }

    function esemenynaploLapozoRenderelese() {
        const elemek = adminElemek();
        const htmlTartalom = esemenynaploLapozoHtml();
        [elemek.esemenynaploLapozoFelso, elemek.esemenynaploLapozo].filter(Boolean).forEach(lapozo => {
            lapozo.innerHTML = htmlTartalom;
        });
    }

    function esemenynaploLapozoKattintas(event) {
        const meretValaszto = event.target.closest('[data-esemenynaplo-oldalmeret]');
        if (meretValaszto) {
            if (event.type === 'click' && meretValaszto.tagName === 'SELECT') {
                return;
            }

            const meretErtek = meretValaszto.dataset.esemenynaploOldalmeret || meretValaszto.value;
            allapot.esemenynaploOldalMeret = meretErtek === 'all' ? 'all' : Number.parseInt(meretErtek, 10);
            allapot.esemenynaploOldal = 1;
            esemenynaploRenderelese();
            return;
        }

        const gomb = event.target.closest('[data-esemenynaplo-oldal]');
        if (!gomb) return;

        allapot.esemenynaploOldal += gomb.dataset.esemenynaploOldal === 'kovetkezo' ? 1 : -1;
        allapot.esemenynaploOldal = Math.min(Math.max(allapot.esemenynaploOldal, 1), esemenynaploOsszesOldal());
        esemenynaploRenderelese();
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
            admin_update_email: 'Módosítás email',
            booking_reminder_email: 'Emlékeztető email',
            booking_review_request_email: 'Értékeléskérő email',
            customer_cancelled: 'A vendég mondta le',
            inspiration_deleted: 'Inspiráció törölve'
        }[tipus] || 'Esemény';
    }

    function foglalasKartyaIdopont(kezdes, vege) {
        const datum = datumIdoRovid(kezdes).split(' ')[0];

        return `
            <p class="admin-foglalas-idopont">
                <span class="admin-foglalas-datum">${html(datum)}</span>
                <span class="admin-foglalas-ido">${html(datumIdoRovid(kezdes, true))} – ${html(datumIdoRovid(vege, true))}</span>
            </p>
        `;
    }

    function foglalasKartya(foglalas) {
        const kartya = document.createElement('article');
        const fuggoben = foglalasFuggoben(foglalas);
        const statuszOsztaly = String(foglalas.status || 'pending').replace(/[^a-z_]/g, '');
        kartya.className = `admin-db-kartya admin-foglalas-kartya admin-foglalas-statusz-${statuszOsztaly}${fuggoben ? ' admin-foglalas-fuggoben' : ''}`;
        kartya.dataset.id = foglalas.id;
        kartya.dataset.tipus = 'booking';
        kartya.dataset.eredetiStatusz = foglalas.status || '';
        kartya.dataset.eredetiDatum = datumInputErtek(foglalas.starts_at);
        kartya.dataset.eredetiKezdes = idoInputErtek(foglalas.starts_at);
        kartya.dataset.eredetiVege = idoInputErtek(foglalas.ends_at);
        const inspiracioKepek = foglalasInspiracioKepek(foglalas);
        const kuponKod = foglalasKuponKod(foglalas);
        const megjegyzes = foglalasMegjegyzesMegjelenites(foglalas);
        const koromStilus = foglalasKoromStilusMegjelenites(foglalas);
        const lemondasiMegjegyzes = vendegLemondasMegjegyzese(foglalas);
        const foglalasAzonosito = String(foglalas.public_reference || '').trim();
        kartya.dataset.inspiracioKepek = JSON.stringify(inspiracioKepek);

        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div class="admin-foglalas-fosor">
                    <div class="admin-foglalas-nev-blokk">
                        <p class="admin-kartya-tipus admin-foglalas-azonosito${foglalasAzonosito ? '' : ' hianyzo'}" aria-label="Foglalási azonosító: ${attr(foglalasAzonosito || 'még nincs')}"><code>${html(foglalasAzonosito || 'Azonosító nélkül')}</code></p>
                        <h3>${html(foglalas.customer_name)}</h3>
                        <p class="admin-foglalas-rovid-szolgaltatas">${html(foglalas.services?.name || 'Törölt szolgáltatás')}</p>
                    </div>
                    ${foglalasKartyaIdopont(foglalas.starts_at, foglalas.ends_at)}
                </div>
                <div class="admin-foglalas-vezerlok">
                    <select class="admin-db-statusz" data-foglalas-statusz disabled>
                        ${statuszOption('pending', 'Függőben', foglalas.status)}
                        ${statuszOption('confirmed', 'Visszaigazolva', foglalas.status)}
                        ${statuszOption('done', 'Kész', foglalas.status)}
                        ${statuszOption('cancelled', 'Általam lemondva', foglalas.status)}
                        ${statuszOption('cancelled_by_customer', 'Vendég mondta le', foglalas.status)}
                    </select>
                    <button type="button" class="admin-booking-details-trigger" data-foglalas-reszletek aria-expanded="false">Részletek</button>
                    <button type="button" class="admin-booking-icon-button" data-foglalas-szerkesztes>Szerkesztés</button>
                </div>
            </div>
            ${lemondasiMegjegyzes ? `
                <p class="admin-foglalas-lemondasi-megjegyzes">
                    <strong>Lemondási megjegyzés</strong>
                    <span>${html(lemondasiMegjegyzes)}</span>
                </p>
            ` : ''}
            <div class="admin-foglalas-reszletek admin-foglalas-reszletek-kompakt">
                <div class="admin-foglalas-meta-grid">
                    <p class="admin-foglalas-meta-szolgaltatas"><strong>Szolgáltatás</strong><span>${html(foglalas.services?.name || 'Törölt szolgáltatás')}</span></p>
                    <p class="admin-foglalas-meta-leadva"><strong>Leadva</strong><span>${html(datumIdoRovid(foglalas.created_at))}</span></p>
                    <p class="admin-foglalas-meta-email"><strong>Email</strong><a href="mailto:${html(foglalas.customer_email)}">${html(foglalas.customer_email)}</a></p>
                    <p class="admin-foglalas-meta-telefon"><strong>Tel</strong><a href="tel:${html(foglalas.customer_phone.replace(/\s/g, ''))}">${html(foglalas.customer_phone)}</a></p>
                </div>
                ${koromStilus ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles admin-foglalas-korom-stilus"><strong>Köröm stílus</strong><span>${html(koromStilus)}</span></p>` : ''}
                ${megjegyzes ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles admin-foglalas-megjegyzes"><strong>Megjegyzés</strong><span>${html(megjegyzes)}</span></p>` : ''}
                ${kuponKod ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles admin-foglalas-kupon"><strong>Kupon</strong><span>${html(kuponKod)}</span></p>` : ''}
                ${inspiracioKepek.length ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles"><strong>Inspiráció</strong><span class="admin-inspiracio-akciok"><button type="button" class="admin-inspiracio-link" data-inspiracio-megnyitas>${inspiracioKepek.length} kép megnyitása</button><button type="button" class="admin-kis-gomb admin-veszely-gomb admin-inspiracio-torles" data-inspiracio-torles>Képek törlése</button></span></p>` : ''}
            </div>            <div class="admin-idopont-szerkeszto">
                <label class="admin-mezo">Dátum<input type="date" data-idopont-mezo="date" value="${attr(datumInputErtek(foglalas.starts_at))}" disabled></label>
                <label class="admin-mezo">Kezdés<input type="time" data-idopont-mezo="start_time" value="${attr(idoInputErtek(foglalas.starts_at))}" disabled></label>
                <label class="admin-mezo">Vége<input type="time" data-idopont-mezo="end_time" value="${attr(idoInputErtek(foglalas.ends_at))}" disabled></label>
                <label class="admin-mezo admin-mezo-szeles">Üzenet az emailhez<textarea data-idopont-mezo="admin_message" placeholder="Opcionális. Lemondásnál vagy időpontmódosításnál bekerül a vendég emailjébe." disabled></textarea></label>
            </div>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-foglalas-torles>Eltávolítás</button>
            </div>
        `;

        return kartya;
    }

    function foglalasKuponKod(foglalas) {
        const direktKod = String(foglalas?.coupon_code || '').trim();
        if (direktKod) return direktKod.toUpperCase();

        const note = String(foglalas?.note || '');
        const talalat = note.match(/(?:^|\n)Kupon:\s*([A-Z0-9_-]+)/i);
        return talalat?.[1] ? talalat[1].toUpperCase() : '';
    }

    function foglalasKoromStilusMegjelenites(foglalas) {
        const direktStilus = String(foglalas?.nail_style || '').trim();
        if (direktStilus) return direktStilus;

        const noteSorok = String(foglalas?.note || '')
            .split(/\r?\n/)
            .map(sor => sor.trim())
            .filter(Boolean);
        const stilusSor = noteSorok.find(sor => /^Köröm stílus:/i.test(sor));
        return stilusSor ? stilusSor.replace(/^Köröm stílus:\s*/i, '').trim() : '';
    }

    function foglalasMegjegyzesMegjelenites(foglalas) {
        const note = String(foglalas?.note || '').trim();
        const stilusMegjegyzes = String(foglalas?.nail_style_note || '').trim();

        const tisztitottNote = note
            .split(/\r?\n/)
            .map(sor => sor.trim())
            .filter(sor => sor
                && !/^(Kupon:|Alap\u00e1r:|Kedvezm\u00e9ny:|V\u00e9g\u00f6sszeg:)/i.test(sor)
                && !/^Köröm stílus:/i.test(sor))
            .join(' ')
            .replace(/\s*Kupon:\s*[A-Z0-9_-]+(?:\s*\([^)]*\))?(?:\s*Alap\u00e1r:[\s\S]*)?$/i, '')
            .replace(/\s*Alap\u00e1r:\s*[\s\S]*$/i, '')
            .replace(/\s*Kedvezm\u00e9ny:\s*[\s\S]*$/i, '')
            .replace(/\s*V\u00e9g\u00f6sszeg:\s*[\s\S]*$/i, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        return [stilusMegjegyzes, tisztitottNote]
            .filter(Boolean)
            .filter((ertek, index, lista) => lista.indexOf(ertek) === index)
            .join(' · ');
    }

    async function foglalasInspiracioLinkekAlairasa(foglalasok) {
        const masolatok = foglalasok.map(foglalas => ({
            ...foglalas,
            inspiration_images: Array.isArray(foglalas.inspiration_images)
                ? foglalas.inspiration_images.map(kep => ({ ...kep }))
                : foglalas.inspiration_images
        }));
        const bucketBejegyzesek = new Map();

        masolatok.forEach((foglalas, foglalasIndex) => {
            if (!Array.isArray(foglalas.inspiration_images)) return;

            foglalas.inspiration_images.forEach((kep, kepIndex) => {
                const bucket = inspiracioKepStorageBucket(kep);
                const path = inspiracioKepStoragePath(kep);
                if (bucket !== 'booking-inspirations' || !path) return;
                if (!bucketBejegyzesek.has(bucket)) bucketBejegyzesek.set(bucket, []);
                bucketBejegyzesek.get(bucket).push({ foglalasIndex, kepIndex, path });
            });
        });

        for (const [bucket, bejegyzesek] of bucketBejegyzesek) {
            const { data, error } = await allapot.kliens.storage
                .from(bucket)
                .createSignedUrls(bejegyzesek.map(bejegyzes => bejegyzes.path), 3600);

            if (error) {
                console.warn('Inspirációs képek ideiglenes linkje nem készült el:', error);
                continue;
            }

            bejegyzesek.forEach((bejegyzes, index) => {
                const signedUrl = data?.[index]?.signedUrl || '';
                if (signedUrl) {
                    masolatok[bejegyzes.foglalasIndex].inspiration_images[bejegyzes.kepIndex].url = signedUrl;
                }
            });
        }

        return masolatok;
    }

    function foglalasInspiracioKepek(foglalas) {
        const kepek = [];
        const ujKepek = Array.isArray(foglalas.inspiration_images) ? foglalas.inspiration_images : [];

        ujKepek.forEach(kep => {
            if (kep?.url) {
                kepek.push({
                    url: kep.url,
                    path: kep.path || '',
                    name: kep.name || 'Inspirációs kép',
                    bucket: kep.bucket || inspiracioKepStorageBucket(kep),
                });
            }
        });

        if (!kepek.length && foglalas.inspiration_image_url) {
            kepek.push({
                url: foglalas.inspiration_image_url,
                path: foglalas.inspiration_image_path || '',
                name: foglalas.inspiration_image_name || 'Inspirációs kép',
                bucket: 'site-media',
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

    function inspiracioKepStorageBucket(kep) {
        const explicitBucket = String(kep?.bucket || '').trim();
        if (explicitBucket) return explicitBucket;

        try {
            const url = new URL(kep?.url || '', window.location.origin);
            if (url.pathname.includes('/storage/v1/object/public/site-media/')) return 'site-media';
        } catch (_error) {
            // A régi rekordok a nyilvános site-media bucketben vannak.
        }

        return 'site-media';
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
                <div class="admin-inspiracio-modal-fejlec">
                    <h3>Inspirációs képek</h3>
                    <button type="button" class="admin-inspiracio-bezaras" data-inspiracio-bezaras aria-label="Bezárás">×</button>
                </div>
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
        const statusz = tiltasStatuszErtek(tiltas.status);
        kartya.className = `admin-db-kartya admin-foglalas-kartya admin-db-kartya-tiltas admin-foglalas-statusz-${statusz}${statusz === 'done' ? ' admin-tiltas-kesz' : ''}${statusz === 'cancelled_by_customer' ? ' admin-tiltas-lemondva' : ''}`;
        kartya.dataset.id = tiltas.id;
        kartya.dataset.tipus = 'blocked';
        kartya.dataset.eredetiStatusz = statusz;
        const megjegyzes = tiltas.reason?.trim() || 'Kézi foglalás';
        kartya.dataset.eredetiDatum = datumInputErtek(tiltas.starts_at);
        kartya.dataset.eredetiKezdes = idoInputErtek(tiltas.starts_at);
        kartya.dataset.eredetiVege = idoInputErtek(tiltas.ends_at);
        kartya.dataset.eredetiReason = megjegyzes;
        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div class="admin-foglalas-fosor">
                    <div class="admin-foglalas-nev-blokk">
                        <span class="admin-kartya-tipus">Kézzel felvett idő</span>
                        <h3>${html(megjegyzes)}</h3>
                        <p class="admin-foglalas-rovid-szolgaltatas" aria-hidden="true"></p>
                    </div>
                    ${foglalasKartyaIdopont(tiltas.starts_at, tiltas.ends_at)}
                </div>
                <div class="admin-foglalas-vezerlok">
                    <select class="admin-db-statusz" data-foglalas-statusz aria-label="Kézi idő státusza" disabled>
                        <option value="blocked" ${statusz === 'blocked' ? 'selected' : ''}>Foglalt</option>
                        <option value="done" ${statusz === 'done' ? 'selected' : ''}>Kész</option>
                        <option value="cancelled_by_customer" ${statusz === 'cancelled_by_customer' ? 'selected' : ''}>Vendég mondta le</option>
                    </select>
                    <button type="button" class="admin-booking-icon-button admin-kezi-ido-naptar" data-kezi-ido-naptar>Naptárba</button>
                    <button type="button" class="admin-booking-icon-button" data-foglalas-szerkesztes>Szerkesztés</button>
                </div>
            </div>
            <div class="admin-idopont-szerkeszto">
                <label class="admin-mezo">Dátum<input type="date" data-idopont-mezo="date" value="${attr(datumInputErtek(tiltas.starts_at))}" disabled></label>
                <label class="admin-mezo">Kezdés<input type="time" data-idopont-mezo="start_time" value="${attr(idoInputErtek(tiltas.starts_at))}" disabled></label>
                <label class="admin-mezo">Vége<input type="time" data-idopont-mezo="end_time" value="${attr(idoInputErtek(tiltas.ends_at))}" disabled></label>
                <label class="admin-mezo admin-mezo-szeles">Név / megjegyzés<input type="text" data-idopont-mezo="reason" value="${attr(megjegyzes)}" required disabled></label>
            </div>
            <div class="admin-db-akciok">
                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-foglalas-torles>Eltávolítás</button>
            </div>
        `;

        return kartya;
    }
    function keziIdoNaptarMegnyitasa(kartya) {
        const adatok = idopontModositasAdatok(kartya);
        const cim = idopontMezo(kartya, 'reason')?.value.trim() || 'Kézi foglalás';

        if (adatok.hiba) {
            onlineStatusz(adatok.hiba, true);
            return;
        }

        const kezdes = new Date(adatok.startsAt);
        const vege = new Date(adatok.endsAt);
        const most = new Date();
        const azonosito = kartya.dataset.id || `${most.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Lumi Nails//Manual booking//HU',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-TIMEZONE:Europe/Budapest',
            'BEGIN:VEVENT',
            `UID:${adminIcsSzoveg(azonosito)}@luminails.hu`,
            `DTSTAMP:${adminIcsDatum(most)}`,
            `DTSTART:${adminIcsDatum(kezdes)}`,
            `DTEND:${adminIcsDatum(vege)}`,
            `SUMMARY:${adminIcsSzoveg(cim)}`,
            'STATUS:CONFIRMED',
            'TRANSP:OPAQUE',
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fajlNev = cim
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('hu-HU')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 48) || 'kezi-foglalas';

        link.href = url;
        link.download = `lumi-nails-${fajlNev}.ics`;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    function adminIcsDatum(datum) {
        return datum.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }

    function adminIcsSzoveg(szoveg) {
        return String(szoveg || '')
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    }

    function foglalasIdopontValtozott(kartya) {
        return kartya.dataset.eredetiDatum !== idopontMezo(kartya, 'date')?.value
            || kartya.dataset.eredetiKezdes !== idopontMezo(kartya, 'start_time')?.value
            || kartya.dataset.eredetiVege !== idopontMezo(kartya, 'end_time')?.value;
    }

    function foglalasKartyaModosult(kartya, modositas) {
        if (kartya.dataset.eredetiStatusz !== modositas.status || foglalasIdopontValtozott(kartya)) {
            return true;
        }

        return kartya.dataset.tipus === 'blocked'
            && String(kartya.dataset.eredetiReason || '').trim() !== String(modositas.reason || '').trim();
    }
    function ujAdminMuveletAzonosito() {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    async function foglalasStatuszokMentese() {
        const kartyak = Array.from(document.querySelectorAll('#admin-foglalas-lista .admin-db-kartya'));

        if (!kartyak.length) {
            onlineStatusz('Nincs menthető foglalási bejegyzés ezen az oldalon.');
            return;
        }

        onlineStatusz('Foglalási módosítások ellenőrzése...');

        const valtozasok = [];

        for (const kartya of kartyak) {
            const adatok = idopontModositasAdatok(kartya);

            if (adatok.hiba) {
                onlineStatusz(adatok.hiba, true);
                return;
            }

            const modositas = kartya.dataset.tipus === 'blocked'
                ? {
                    status: tiltasStatuszErtek(kartya.querySelector('[data-foglalas-statusz]')?.value),
                    starts_at: adatok.startsAt,
                    ends_at: adatok.endsAt,
                    reason: idopontMezo(kartya, 'reason')?.value.trim()
                }
                : {
                    status: kartya.querySelector('[data-foglalas-statusz]').value,
                    starts_at: adatok.startsAt,
                    ends_at: adatok.endsAt
                };

            if (!foglalasKartyaModosult(kartya, modositas)) {
                continue;
            }

            const utkozesHiba = await idopontUtkozesHiba({
                tipus: kartya.dataset.tipus,
                id: kartya.dataset.id,
                nev: kartya.dataset.tipus === 'blocked'
                    ? modositas.reason
                    : kartya.querySelector('h3')?.textContent?.trim(),
                startsAt: adatok.startsAt,
                endsAt: adatok.endsAt,
                statusz: modositas.status
            });

            if (utkozesHiba) {
                onlineStatusz(utkozesHiba, true);
                return;
            }

            const emailModositas = kartya.dataset.tipus === 'booking'
                ? foglalasEmailModositas(kartya, modositas)
                : null;

            valtozasok.push({
                kartya,
                modositas,
                emailModositas,
                inspiraciotTorol: kartya.dataset.tipus === 'booking'
                    && ['done', 'cancelled', 'cancelled_by_customer'].includes(modositas.status)
            });
        }

        if (!valtozasok.length) {
            onlineStatusz('Nem történt módosítás.');
            return;
        }

        onlineStatusz('Foglalási módosítások mentése...');

        const rpcChanges = valtozasok.map(({ kartya, modositas, emailModositas }) => ({
            id: kartya.dataset.id,
            type: kartya.dataset.tipus,
            status: modositas.status,
            starts_at: modositas.starts_at,
            ends_at: modositas.ends_at,
            reason: modositas.reason || '',
            email_notification: emailModositas
        }));
        const muveletUjjlenyomat = JSON.stringify(rpcChanges);
        const elozoMuvelet = allapot.foglalasMentesMuvelet;
        const operationId = elozoMuvelet?.ujjlenyomat === muveletUjjlenyomat
            ? elozoMuvelet.id
            : ujAdminMuveletAzonosito();
        allapot.foglalasMentesMuvelet = { id: operationId, ujjlenyomat: muveletUjjlenyomat };

        const { data, error } = await allapot.kliens.rpc('apply_admin_booking_changes', {
            p_operation_id: operationId,
            p_changes: rpcChanges
        });

        if (error) {
            const uzenet = String(error.message || '');
            if (/ütközik|utkozik|szünet|szunet|exclusion/i.test(uzenet)) {
                onlineStatusz('Nem sikerült menteni: az egyik módosított időpont ütközik egy másik foglalással vagy a kötelező szünettel.', true);
                return;
            }
            onlineStatusz(`Egyetlen módosítás sem lett mentve. ${uzenet}`, true);
            return;
        }

        allapot.foglalasMentesMuvelet = null;
        let kepTorlesHibak = 0;
        for (const valtozas of valtozasok) {
            if (!valtozas.inspiraciotTorol) continue;
            const kepekTorolve = await foglalasInspiraciokTorlese(valtozas.kartya);
            if (!kepekTorolve) kepTorlesHibak += 1;
        }

        const emailJobs = Array.isArray(data?.email_jobs) ? data.email_jobs : [];
        let emailAzonnalElkuldve = 0;
        let emailUjraprobalasraVar = 0;

        for (const job of emailJobs) {
            const eredmeny = await foglalasModositasEmailKuldese(job.booking_id, job.id);
            if (eredmeny.ok) {
                emailAzonnalElkuldve += 1;
            } else {
                emailUjraprobalasraVar += 1;
            }
        }

        if (kepTorlesHibak > 0) {
            onlineStatusz(`A módosítások mentve, de ${kepTorlesHibak} foglalás inspirációs képeit nem sikerült törölni.`, true);
        } else if (emailUjraprobalasraVar > 0) {
            onlineStatusz(`A módosítások mentve. ${emailUjraprobalasraVar} email automatikus újrapróbálásra vár.`);
        } else if (emailAzonnalElkuldve > 0) {
            onlineStatusz(`Foglalási módosítások mentve, ${emailAzonnalElkuldve} email értesítés elküldve.`);
        } else {
            onlineStatusz('Foglalási módosítások mentve. A szabad idősávok ehhez igazodnak.');
        }

        await Promise.all([
            foglalasokBetoltese(),
            esemenynaploBetoltese()
        ]);
    }

    async function foglalasInspiraciokTorlese(kartya, opciok = {}) {
        const kepek = inspiracioKepekKartyan(kartya);
        const pathsByBucket = new Map();
        kepek.forEach(kep => {
            const path = inspiracioKepStoragePath(kep);
            if (!path) return;
            const bucket = inspiracioKepStorageBucket(kep);
            if (!pathsByBucket.has(bucket)) pathsByBucket.set(bucket, new Set());
            pathsByBucket.get(bucket).add(path);
        });
        const mezokUritese = opciok.mezokUritese !== false;

        if (!kepek.length) return true;

        if (!pathsByBucket.size) {
            console.warn('Inspirációs kép van a foglaláson, de nincs törölhető Storage path.');
            return false;
        }

        for (const [bucket, pathSet] of pathsByBucket) {
            const { error: torlesHiba } = await allapot.kliens.storage
                .from(bucket)
                .remove(Array.from(pathSet));

            if (torlesHiba) {
                console.warn('Inspirációs képek Storage törlése nem sikerült:', { bucket, error: torlesHiba });
                return false;
            }
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
        const idopontValtozott = foglalasIdopontValtozott(kartya);

        if (!statuszValtozott && !idopontValtozott) {
            return null;
        }

        if (modositas.status === 'cancelled_by_customer') {
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

    async function foglalasModositasEmailKuldese(bookingId, emailJobId) {
        if (!bookingId || !emailJobId || !allapot.kliens.functions?.invoke) {
            return { ok: false, skipped: true };
        }

        try {
            const invokeOptions = {
                body: {
                    booking_id: bookingId,
                    email_job_id: emailJobId
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
        const reszletek = event.target.closest('[data-foglalas-reszletek]');
        const inspiracio = event.target.closest('[data-inspiracio-megnyitas]');
        const inspiracioTorles = event.target.closest('[data-inspiracio-torles]');
        const keziIdoNaptar = event.target.closest('[data-kezi-ido-naptar]');
        const szerkesztes = event.target.closest('[data-foglalas-szerkesztes]');
        const torles = event.target.closest('[data-foglalas-torles]');

        if (reszletek) {
            foglalasReszletekKapcsolasa(reszletek.closest('.admin-db-kartya'));
            return;
        }

        if (inspiracio) {
            inspiracioModalNyitasa(inspiracio.closest('.admin-db-kartya'));
            return;
        }

        if (keziIdoNaptar) {
            keziIdoNaptarMegnyitasa(keziIdoNaptar.closest('.admin-db-kartya'));
            return;
        }

        if (inspiracioTorles) {
            const kartya = inspiracioTorles.closest('.admin-db-kartya');
            const kepek = inspiracioKepekKartyan(kartya);
            if (!kepek.length) {
                onlineStatusz('Ehhez a foglaláshoz már nem tartozik inspirációs kép.');
                return;
            }

            if (!window.confirm(`Biztosan végleg törlöd a foglaláshoz tartozó ${kepek.length} inspirációs képet?`)) {
                return;
            }

            onlineStatusz('Inspirációs képek törlése...');
            inspiracioTorles.disabled = true;
            const kepekTorolve = await foglalasInspiraciokTorlese(kartya);
            if (!kepekTorolve) {
                inspiracioTorles.disabled = false;
                onlineStatusz('Az inspirációs képek törlése nem sikerült. Kérlek próbáld újra, vagy ellenőrizd a Supabase Storage jogosultságot.', true);
                return;
            }

            await foglalasEsemenyRogzitese(kartya.dataset.id, {
                event_type: 'inspiration_deleted',
                channel: 'admin',
                status: 'success',
                title: 'Inspirációs képek törölve',
                message: `${kepek.length} inspirációs kép véglegesen törölve lett.`,
                metadata: { image_count: kepek.length }
            });
            onlineStatusz(`${kepek.length} inspirációs kép törölve.`);
            esemenynaploBetoltese();
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
        if (aktiv) foglalasReszletekKapcsolasa(kartya, true);

        kartya.querySelectorAll('[data-idopont-mezo], [data-foglalas-statusz]').forEach(mezoElem => {
            mezoElem.disabled = !aktiv;
        });

        const gomb = kartya.querySelector('[data-foglalas-szerkesztes]');

        if (gomb) {
            gomb.textContent = aktiv ? 'Bezárás' : 'Szerkesztés';
        }
    }

    function adminV2VendegPanelLetrehozasa(workspaceMain) {
        if (document.getElementById('admin-panel-vendegek')) return;

        const panel = document.createElement('section');
        panel.id = 'admin-panel-vendegek';
        panel.className = 'admin-db-panel admin-vendeg-panel';
        panel.innerHTML = `
            <div class="admin-v2-page-heading">
                <div>
                    <p class="admin-v2-kicker">Vendégfiókok</p>
                    <h1>Regisztrált tagok</h1>
                    <p>Név, e-mail és telefonszám.</p>
                </div>
            </div>
            <p class="admin-vendeg-osszefoglalo" data-vendeg-osszefoglalo aria-live="polite">Betöltés…</p>
            <div class="admin-vendeg-lista" data-vendeg-lista aria-label="Regisztrált tagok listája">
                <p class="admin-vendeg-ures">Regisztrált tagok betöltése…</p>
            </div>
        `;

        workspaceMain.append(panel);
    }

    async function vendegProfilokBetoltese() {
        const panel = document.getElementById('admin-panel-vendegek');
        if (!panel || !allapot.kliens || !allapot.session) return;
        if (allapot.vendegProfilok.length) {
            vendegProfilListaRenderelese();
            return;
        }

        const keresId = ++allapot.vendegProfilKeresId;
        const lista = panel.querySelector('[data-vendeg-lista]');
        const osszefoglalo = panel.querySelector('[data-vendeg-osszefoglalo]');
        if (lista) lista.innerHTML = '<p class="admin-vendeg-ures">Regisztrált tagok betöltése…</p>';
        if (osszefoglalo) osszefoglalo.textContent = 'Betöltés…';

        const { data, error } = await allapot.kliens
            .rpc('admin_registered_customer_profiles');

        if (keresId !== allapot.vendegProfilKeresId) return;
        if (error) {
            if (lista) lista.innerHTML = '<p class="admin-vendeg-ures admin-vendeg-hiba">Nem sikerült betölteni a regisztrált tagokat.</p>';
            if (osszefoglalo) osszefoglalo.textContent = 'Betöltési hiba';
            onlineStatusz('Nem sikerült betölteni a regisztrált tagokat.', true);
            return;
        }

        allapot.vendegProfilok = Array.isArray(data) ? data : [];
        vendegProfilListaRenderelese();
    }

    function vendegProfilListaRenderelese() {
        const panel = document.getElementById('admin-panel-vendegek');
        const lista = panel?.querySelector('[data-vendeg-lista]');
        const osszefoglalo = panel?.querySelector('[data-vendeg-osszefoglalo]');
        if (!lista || !osszefoglalo) return;

        osszefoglalo.textContent = `${allapot.vendegProfilok.length} regisztrált tag`;

        if (!allapot.vendegProfilok.length) {
            lista.innerHTML = '<p class="admin-vendeg-ures">Még nincs regisztrált tag.</p>';
            return;
        }

        lista.innerHTML = allapot.vendegProfilok.map(profile => `
            <div class="admin-vendeg-sor">
                <span class="admin-vendeg-monogram">${html(vendegMonogram(profile.customer_name))}</span>
                <span class="admin-vendeg-sor-copy">
                    <strong>${html(profile.customer_name || 'Név nincs megadva')}</strong>
                    <small>${html(profile.customer_email || 'E-mail nincs megadva')}</small>
                    <small>${html(profile.customer_phone || 'Telefon nincs megadva')}</small>
                </span>
            </div>
        `).join('');
    }

    function vendegMonogram(value) {
        const parts = String(value || '?').trim().split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase('hu-HU') || '?';
    }

    function foglalasAttekintesFrissitese(szurtElemek = foglalasSzurtElemek()) {
        const elemek = adminElemek();
        if (!elemek.foglalasOsszefoglalo) return;

        const osszes = allapot.foglalasElemek.length;
        const most = Date.now();
        const jovobeli = szurtElemek.filter(elem => {
            const statusz = String(elem.adat?.status || '').toLowerCase();
            return new Date(elem.datum).getTime() >= most
                && !['cancelled', 'cancelled_by_customer', 'done'].includes(statusz);
        }).length;
        const fuggoben = szurtElemek.filter(elem =>
            elem.tipus === 'booking' && foglalasFuggoben(elem.adat)
        ).length;
        const talalat = szurtElemek.length === osszes
            ? osszes + ' bejegyzés'
            : szurtElemek.length + ' találat · ' + osszes + ' összesen';

        elemek.foglalasOsszefoglalo.textContent =
            talalat + ' · ' + jovobeli + ' közelgő · ' + fuggoben + ' függőben';
    }

    function foglalasDatumKulcs(ertek) {
        const datum = ertek instanceof Date ? ertek : new Date(ertek);
        if (Number.isNaN(datum.getTime())) return '';

        const reszek = new Intl.DateTimeFormat('hu-HU', {
            timeZone: 'Europe/Budapest',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(datum);
        const ertekek = Object.fromEntries(reszek.map(resz => [resz.type, resz.value]));
        return ertekek.year + '-' + ertekek.month + '-' + ertekek.day;
    }

    function foglalasNaptarNapKulcs(ev, honap, nap) {
        return ev + '-' + String(honap + 1).padStart(2, '0') + '-' + String(nap).padStart(2, '0');
    }

    function foglalasNaptarHonapElemei(szurtElemek = foglalasSzurtElemek()) {
        const honap = allapot.foglalasNaptarHonap;
        const ev = honap.getFullYear();
        const honapIndex = honap.getMonth();
        const honapKulcs = ev + '-' + String(honapIndex + 1).padStart(2, '0');
        return szurtElemek.filter(elem => foglalasDatumKulcs(elem.datum).startsWith(honapKulcs));
    }

    function foglalasNaptarStatuszOsztaly(elem) {
        return String(elem.adat?.status || (elem.tipus === 'blocked' ? 'blocked' : 'pending'))
            .toLowerCase()
            .replace(/[^a-z_]/g, '');
    }

    function foglalasNaptarbanLathato(elem) {
        return !['cancelled', 'cancelled_by_customer'].includes(foglalasNaptarStatuszOsztaly(elem));
    }

    function foglalasNaptarStatuszFelirat(elem) {
        const statusz = foglalasNaptarStatuszOsztaly(elem);
        if (elem.tipus === 'blocked' && statusz === 'blocked') return 'Kézi foglalt';
        return {
            pending: 'Függőben',
            confirmed: 'Visszaigazolva',
            done: 'Kész',
            cancelled: 'Általam lemondva',
            cancelled_by_customer: 'Vendég mondta le',
            blocked: 'Foglalt'
        }[statusz] || 'Foglalás';
    }

    function foglalasNaptarElemNev(elem) {
        return elem.tipus === 'blocked'
            ? elem.adat?.reason?.trim() || 'Kézzel felvett idő'
            : elem.adat?.customer_name?.trim() || 'Névtelen foglalás';
    }

    function foglalasNaptarIdo(ertek) {
        const datum = new Date(ertek);
        if (Number.isNaN(datum.getTime())) return '';
        return datum.toLocaleTimeString('hu-HU', {
            timeZone: 'Europe/Budapest',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function foglalasNaptarRenderelese(szurtElemek = foglalasSzurtElemek()) {
        const elemek = adminElemek();
        if (!elemek.foglalasNaptarRacs || !elemek.foglalasNaptarCim) return;

        if (!allapot.foglalasNaptarKijeloltDatum) {
            allapot.foglalasNaptarKijeloltDatum = foglalasDatumKulcs(new Date());
        }

        const honap = allapot.foglalasNaptarHonap;
        const ev = honap.getFullYear();
        const honapIndex = honap.getMonth();
        const elsoNapEltolas = (new Date(ev, honapIndex, 1).getDay() + 6) % 7;
        const napokSzama = new Date(ev, honapIndex + 1, 0).getDate();
        const maiKulcs = foglalasDatumKulcs(new Date());
        const honapElemek = foglalasNaptarHonapElemei(szurtElemek)
            .filter(foglalasNaptarbanLathato);
        const napok = new Map();

        honapElemek.forEach(elem => {
            const kulcs = foglalasDatumKulcs(elem.datum);
            if (!napok.has(kulcs)) napok.set(kulcs, []);
            napok.get(kulcs).push(elem);
        });
        napok.forEach(lista => lista.sort((a, b) => new Date(a.datum) - new Date(b.datum)));

        elemek.foglalasNaptarCim.textContent = honap.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'long'
        });

        const cellak = [];
        for (let index = 0; index < elsoNapEltolas; index += 1) {
            cellak.push('<span class="admin-foglalas-naptar-cella admin-foglalas-naptar-ures" role="gridcell" aria-hidden="true"></span>');
        }

        for (let nap = 1; nap <= napokSzama; nap += 1) {
            const kulcs = foglalasNaptarNapKulcs(ev, honapIndex, nap);
            const napiElemek = napok.get(kulcs) || [];
            const kijelolt = kulcs === allapot.foglalasNaptarKijeloltDatum;
            const mai = kulcs === maiKulcs;
            const elonezet = napiElemek.slice(0, 2).map(elem =>
                '<span class="admin-foglalas-naptar-esemeny admin-foglalas-naptar-statusz-'
                + attr(foglalasNaptarStatuszOsztaly(elem)) + '" title="'
                + attr([
                    foglalasNaptarIdo(elem.datum),
                    foglalasNaptarElemNev(elem),
                    foglalasNaptarStatuszFelirat(elem)
                ].join(' · ')) + '" aria-hidden="true"><time>'
                + html(foglalasNaptarIdo(elem.datum)) + '</time></span>'
            ).join('');
            const tovabbi = napiElemek.length > 2
                ? '<span class="admin-foglalas-naptar-tovabbi">+' + (napiElemek.length - 2) + '</span>'
                : '';
            const aria = nap + '. nap, ' + napiElemek.length + ' aktív bejegyzés';

            cellak.push(
                '<div class="admin-foglalas-naptar-cella" role="gridcell">'
                + '<button type="button" class="admin-foglalas-naptar-nap'
                + (kijelolt ? ' kijelolt' : '') + (mai ? ' mai' : '')
                + '" data-foglalas-naptar-datum="' + attr(kulcs)
                + '" aria-label="' + attr(aria)
                + '" aria-pressed="' + (kijelolt ? 'true' : 'false') + '">'
                + '<span class="admin-foglalas-naptar-napszam">' + nap + '</span>'
                + (napiElemek.length ? '<span class="admin-foglalas-naptar-darab">' + napiElemek.length + '</span>' : '')
                + '<span class="admin-foglalas-naptar-esemenyek">' + elonezet + tovabbi + '</span>'
                + '</button></div>'
            );
        }

        elemek.foglalasNaptarRacs.innerHTML = cellak.join('');
        foglalasNapiListaRenderelese(szurtElemek);
    }

    function foglalasNapiListaRenderelese(szurtElemek = foglalasSzurtElemek()) {
        const elemek = adminElemek();
        if (!elemek.foglalasNapiLista || !elemek.foglalasNapiCim || !elemek.foglalasNapiDarab) return;

        const kulcs = allapot.foglalasNaptarKijeloltDatum;
        const datum = kulcs ? new Date(kulcs + 'T12:00:00') : null;
        const napiElemek = szurtElemek
            .filter(elem => foglalasDatumKulcs(elem.datum) === kulcs)
            .sort((a, b) => new Date(a.datum) - new Date(b.datum));

        elemek.foglalasNapiCim.textContent = datum && !Number.isNaN(datum.getTime())
            ? datum.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' })
            : 'Válassz egy napot';
        elemek.foglalasNapiDarab.textContent = napiElemek.length ? napiElemek.length + ' bejegyzés' : '';

        if (!napiElemek.length) {
            elemek.foglalasNapiLista.innerHTML =
                '<p class="admin-ures">Erre a napra nincs a szűrésnek megfelelő bejegyzés.</p>';
            return;
        }

        elemek.foglalasNapiLista.innerHTML = napiElemek.map(elem => {
            const adat = elem.adat || {};
            const nev = foglalasNaptarElemNev(elem);
            const szolgaltatas = elem.tipus === 'blocked'
                ? 'Kézzel felvett idő'
                : adat.services?.name || 'Törölt szolgáltatás';
            return '<button type="button" class="admin-foglalas-napi-sor admin-foglalas-naptar-statusz-'
                + attr(foglalasNaptarStatuszOsztaly(elem))
                + '" data-foglalas-naptar-megnyitas data-foglalas-id="' + attr(adat.id || '') + '">'
                + '<span class="admin-foglalas-napi-ido"><time>' + html(foglalasNaptarIdo(adat.starts_at))
                + '</time><span>–</span><time>' + html(foglalasNaptarIdo(adat.ends_at)) + '</time></span>'
                + '<span class="admin-foglalas-napi-adat"><strong>' + html(nev)
                + '</strong><small>' + html(szolgaltatas) + '</small></span>'
                + '<span class="admin-foglalas-napi-statusz">' + html(foglalasNaptarStatuszFelirat(elem)) + '</span>'
                + '</button>';
        }).join('');
    }

    function foglalasNezetValtasa(ujNezet) {
        const elemek = adminElemek();
        const nezet = ujNezet === 'naptar' ? 'naptar' : 'lista';
        allapot.foglalasNezet = nezet;

        if (elemek.foglalasListaNezet) elemek.foglalasListaNezet.hidden = nezet !== 'lista';
        if (elemek.foglalasNaptar) elemek.foglalasNaptar.hidden = nezet !== 'naptar';
        elemek.foglalasNezetGombok.forEach(gomb => {
            const aktiv = gomb.dataset.foglalasNezet === nezet;
            gomb.classList.toggle('aktiv', aktiv);
            gomb.setAttribute('aria-pressed', String(aktiv));
        });

        if (nezet === 'naptar') {
            foglalasNaptarRenderelese();
            elemek.foglalasNaptarCim?.focus({ preventScroll: true });
        }
    }

    function foglalasNaptarKattintas(event) {
        const honapLepes = event.target.closest('[data-foglalas-naptar-lepes]');
        const mai = event.target.closest('[data-foglalas-naptar-ma]');
        const nap = event.target.closest('[data-foglalas-naptar-datum]');
        const megnyitas = event.target.closest('[data-foglalas-naptar-megnyitas]');

        if (honapLepes) {
            const lepes = Number.parseInt(honapLepes.dataset.foglalasNaptarLepes, 10) || 0;
            const jelenlegi = allapot.foglalasNaptarHonap;
            allapot.foglalasNaptarHonap = new Date(
                jelenlegi.getFullYear(),
                jelenlegi.getMonth() + lepes,
                1
            );
            allapot.foglalasNaptarKijeloltDatum = foglalasNaptarNapKulcs(
                allapot.foglalasNaptarHonap.getFullYear(),
                allapot.foglalasNaptarHonap.getMonth(),
                1
            );
            foglalasNaptarRenderelese();
            return;
        }

        if (mai) {
            const most = new Date();
            allapot.foglalasNaptarHonap = new Date(most.getFullYear(), most.getMonth(), 1);
            allapot.foglalasNaptarKijeloltDatum = foglalasDatumKulcs(most);
            foglalasNaptarRenderelese();
            return;
        }

        if (nap) {
            allapot.foglalasNaptarKijeloltDatum = nap.dataset.foglalasNaptarDatum;
            foglalasNaptarRenderelese();
            return;
        }

        if (!megnyitas) return;

        const foglalasId = megnyitas.dataset.foglalasId;
        const elem = allapot.foglalasElemek.find(bejegyzes =>
            String(bejegyzes.adat?.id || '') === foglalasId
        );
        if (!elem) return;

        const keresesiErtek = elem.adat?.public_reference
            || elem.adat?.id
            || elem.adat?.customer_email
            || foglalasNaptarElemNev(elem);
        allapot.foglalasKereses = keresesiErtek;
        allapot.foglalasStatuszSzuro = 'all';
        allapot.foglalasOldal = 1;

        const elemek = adminElemek();
        if (elemek.foglalasKereses) elemek.foglalasKereses.value = keresesiErtek;
        foglalasKeresesTorlesGombFrissitese(elemek);
        if (elemek.foglalasStatuszSzuro) elemek.foglalasStatuszSzuro.value = 'all';
        foglalasListaRenderelese();
        foglalasNezetValtasa('lista');

        window.requestAnimationFrame(() => {
            const kartya = Array.from(elemek.foglalasLista?.children || [])
                .find(bejegyzes => bejegyzes.dataset.id === foglalasId);
            if (!kartya) return;
            foglalasReszletekKapcsolasa(kartya, true);
            kartya.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    function foglalasReszletekKapcsolasa(kartya, kenyszeritettAllapot) {
        if (!kartya) return;
        const nyitott = typeof kenyszeritettAllapot === 'boolean'
            ? kenyszeritettAllapot
            : !kartya.classList.contains('admin-foglalas-kartya-nyitott');
        kartya.classList.toggle('admin-foglalas-kartya-nyitott', nyitott);

        const gomb = kartya.querySelector('[data-foglalas-reszletek]');
        if (gomb) {
            gomb.setAttribute('aria-expanded', String(nyitott));
            gomb.textContent = nyitott ? 'Elrejtés' : 'Részletek';
        }
    }

    async function szolgaltatasokBetoltese() {
        const elemek = adminElemek();
        let { data, error } = await allapot.kliens
            .from('services')
            .select('id,name,description,price_text,price_amount,price_unit,price_suffix,duration_minutes,booking_enabled,active,sort_order')
            .order('sort_order', { ascending: true });

        if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
            ({ data, error } = await allapot.kliens
                .from('services')
                .select('id,name,description,price_text,duration_minutes,booking_enabled,active,sort_order')
                .order('sort_order', { ascending: true }));
        }

        if (error) {
            onlineStatusz('Nem sikerült betölteni az árlista tételeket.', true);
            return;
        }

        allapot.szolgaltatasok = (data || []).map(szolgaltatasArNormalizalasa);
        elemek.szolgaltatasLista.innerHTML = '';
        allapot.szolgaltatasok.forEach(szolgaltatas => elemek.szolgaltatasLista.appendChild(szolgaltatasKartya(szolgaltatas)));
    }

    function szolgaltatasArNormalizalasa(szolgaltatas) {
        const priceText = szolgaltatas.price_text || '';
        const priceAmount = Number.isFinite(Number(szolgaltatas.price_amount)) && Number(szolgaltatas.price_amount) > 0
            ? Number(szolgaltatas.price_amount)
            : arOsszegKinyerese(priceText);
        const priceUnit = szolgaltatas.price_unit || arEgysegKinyerese(priceText) || 'Ft';
        const priceValue = priceAmount > 0 ? String(priceAmount) : arErtekKinyerese(priceText);

        return {
            ...szolgaltatas,
            price_amount: priceAmount || null,
            price_value: priceValue,
            price_unit: priceUnit,
            price_suffix: '',
            price_text: priceText || arFelirat(priceValue || priceAmount, priceUnit)
        };
    }

    function szolgaltatasKartya(szolgaltatas) {
        const ora = Math.floor((szolgaltatas.duration_minutes || 0) / 60);
        const perc = (szolgaltatas.duration_minutes || 0) % 60;
        const idoFelirat = [ora ? `${ora} óra` : '', perc ? `${perc} perc` : ''].filter(Boolean).join(' ') || 'Nincs időtartam';
        const arOsszeg = arFelirat(szolgaltatas.price_value, szolgaltatas.price_unit) || 'Nincs ár';
        const ujTetel = /^Új\b/i.test(String(szolgaltatas.name || '').trim());
        const kartya = document.createElement('article');
        kartya.className = `admin-db-kartya admin-szerkesztheto-kartya admin-szolgaltatas-kartya${ujTetel ? ' szerkeszt' : ''}`;
        kartya.dataset.id = szolgaltatas.id;

        kartya.innerHTML = `
            <div class="admin-kompakt-kartya-fej">
                <div class="admin-kompakt-kartya-osszefoglalo">
                    <h3>${html(szolgaltatas.name)}</h3>
                    <p>${html(arOsszeg)} · ${html(idoFelirat)}</p>
                </div>
                <div class="admin-kompakt-kartya-vezerlok">
                    <span class="admin-allapot-jelzo${szolgaltatas.active ? '' : ' inaktiv'}">${szolgaltatas.active ? 'Látható' : 'Rejtett'}</span>
                    <span class="admin-allapot-jelzo${szolgaltatas.booking_enabled ? '' : ' inaktiv'}">${szolgaltatas.booking_enabled ? 'Foglalható' : 'Nem foglalható'}</span>
                    <button type="button" class="admin-kis-gomb admin-ikonos-gomb" data-admin-kartya-toggle aria-expanded="${String(ujTetel)}">${adminV2Ikon(ujTetel ? 'close' : 'edit')}<span>${ujTetel ? 'Bezárás' : 'Szerkesztés'}</span></button>
                </div>
            </div>
            <div class="admin-kompakt-szerkeszto">
                <div class="admin-szolgaltatas-szerkeszto-racs">
                    <fieldset class="admin-szerkeszto-szakasz">
                        <legend>Alapadatok</legend>
                        <div class="admin-szolgaltatas-alapadatok">
                            <label class="admin-mezo admin-szolgaltatas-nev">Szolgáltatás neve<input type="text" data-mezo="name" value="${attr(szolgaltatas.name)}"></label>
                            <label class="admin-mezo admin-szolgaltatas-foglalasi-nev">Rövid név a foglalásban<input type="text" data-mezo="description" value="${attr(szolgaltatas.description || '')}" placeholder="Ha üres, a teljes név látszik"></label>
                            <div class="admin-szolgaltatas-fej-opciok">
                                <label class="admin-mezo admin-checkbox"><input type="checkbox" data-mezo="booking_enabled" ${szolgaltatas.booking_enabled ? 'checked' : ''}> Foglalható</label>
                                <label class="admin-mezo admin-checkbox"><input type="checkbox" data-mezo="active" ${szolgaltatas.active ? 'checked' : ''}> Látható</label>
                            </div>
                        </div>
                    </fieldset>
                    <fieldset class="admin-szerkeszto-szakasz">
                        <legend>Ár és időtartam</legend>
                        <div class="admin-szolgaltatas-szamok">
                        <label class="admin-mezo admin-szolgaltatas-ar">Ár<input type="text" data-mezo="price_amount" value="${attr(szolgaltatas.price_value || '')}" placeholder="7000 vagy 500-800"></label>
                        <label class="admin-mezo admin-szolgaltatas-egyseg">Egység<input type="text" data-mezo="price_unit" value="${attr(szolgaltatas.price_unit || 'Ft')}" placeholder="Ft, Ft/db, Ft-tól"></label>
                        <label class="admin-mezo admin-szolgaltatas-ido">Óra<input type="number" min="0" step="1" data-mezo="ora" value="${ora}"></label>
                        <label class="admin-mezo admin-szolgaltatas-ido">Perc<input type="number" min="0" max="59" step="1" data-mezo="perc" value="${perc}"></label>
                        </div>
                    </fieldset>
                    <input type="hidden" data-mezo="sort_order" value="${Number(szolgaltatas.sort_order) || 0}">
                </div>
                <div class="admin-db-akciok">
                    <div class="admin-sorrend-akciok" role="group" aria-label="Árlista sorrendje">
                        <button type="button" class="admin-kis-gomb admin-ikonos-gomb" data-szolgaltatas-mozgat="fel">${adminV2Ikon('up')}<span>Feljebb</span></button>
                        <button type="button" class="admin-kis-gomb admin-ikonos-gomb" data-szolgaltatas-mozgat="le">${adminV2Ikon('down')}<span>Lejjebb</span></button>
                    </div>
                    <button type="button" class="admin-kis-gomb admin-veszely-gomb admin-ikonos-gomb" data-szolgaltatas-torles>${adminV2Ikon('trash')}<span>Törlés</span></button>
                </div>
            </div>
        `;
        return kartya;
    }

    function ujSzolgaltatasNev(szolgaltatasok = allapot.szolgaltatasok) {
        const alapNev = 'Új kategória - új tétel';
        const hasznaltNevek = new Set(szolgaltatasok.map(szolgaltatas =>
            String(szolgaltatas?.name || '').trim().toLocaleLowerCase('hu-HU')));
        let sorszam = 1;
        let nev = alapNev;

        while (hasznaltNevek.has(nev.toLocaleLowerCase('hu-HU'))) {
            sorszam += 1;
            nev = alapNev + ' ' + sorszam;
        }

        return nev;
    }

    function szolgaltatasInsertPayload(tetel, regiArSchema) {
        if (!regiArSchema) {
            return tetel;
        }

        const { price_amount, price_unit, price_suffix, ...regiTetel } = tetel;
        return regiTetel;
    }

    function szolgaltatasNevUtkozes(error) {
        return String(error?.code || '') === '23505'
            || String(error?.message || '').toLowerCase().includes('services_name_key');
    }

    async function szolgaltatasHozzaadas() {
        onlineStatusz('Új árlista tétel létrehozása...');

        const ujTetel = {
            name: 'Új kategória - új tétel',
            price_text: '',
            price_amount: null,
            price_unit: 'Ft',
            price_suffix: '',
            duration_minutes: 60,
            booking_enabled: true,
            active: true,
            sort_order: 999
        };
        ujTetel.name = ujSzolgaltatasNev();

        let regiArSchema = false;
        let { error } = await allapot.kliens.from('services').insert(ujTetel);

        if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
            regiArSchema = true;
            ({ error } = await allapot.kliens.from('services').insert(szolgaltatasInsertPayload(ujTetel, true)));
        }

        if (error && szolgaltatasNevUtkozes(error)) {
            const { data: nevAdatok, error: nevHiba } = await allapot.kliens
                .from('services')
                .select('name');

            if (!nevHiba) {
                ujTetel.name = ujSzolgaltatasNev(nevAdatok || []);
                ({ error } = await allapot.kliens
                    .from('services')
                    .insert(szolgaltatasInsertPayload(ujTetel, regiArSchema)));
            }
        }

        if (error) {
            console.error('Új árlista tétel létrehozási hiba:', error);
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

        const szerkesztes = event.target.closest('[data-admin-kartya-toggle]');
        if (szerkesztes) {
            adminKartyaSzerkesztesKapcsolasa(kartya, szerkesztes);
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
            const payload = szolgaltatasPayload(kartya);
            let { error } = await allapot.kliens
                .from('services')
                .update(payload)
                .eq('id', kartya.dataset.id);

            if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
                const { price_amount, price_unit, price_suffix, ...regiPayload } = payload;
                ({ error } = await allapot.kliens
                    .from('services')
                    .update(regiPayload)
                    .eq('id', kartya.dataset.id));
            }

            if (error) {
                onlineStatusz('Nem sikerült menteni az egyik árlista tételt.', true);
                return;
            }
        }

        onlineStatusz('Árlista mentve.');
        await szolgaltatasokBetoltese();
        kuponokBetoltese();
    }

    function szolgaltatasPayload(kartya) {
        const ora = szamMezo(kartya, 'ora');
        const perc = szamMezo(kartya, 'perc');
        const priceValue = mezo(kartya, 'price_amount').value.trim();
        const priceAmount = arSzamolhatoOsszeg(priceValue);
        const priceUnit = mezo(kartya, 'price_unit').value.trim() || 'Ft';

        return {
            name: mezo(kartya, 'name').value.trim(),
            description: mezo(kartya, 'description').value.trim(),
            price_text: arFelirat(priceValue, priceUnit),
            price_amount: priceAmount,
            price_unit: priceUnit,
            price_suffix: '',
            duration_minutes: (ora * 60) + perc,
            sort_order: szamMezo(kartya, 'sort_order'),
            booking_enabled: mezo(kartya, 'booking_enabled').checked,
            active: mezo(kartya, 'active').checked
        };
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

    async function kuponokBetoltese() {
        const elemek = adminElemek();
        if (!elemek.kuponLista) return;

        let { data, error } = await allapot.kliens
            .from('coupons')
            .select('id,code,title,description,discount_type,discount_value,discount_text,service_id,service_category,customer_scope,valid_from,valid_until,active,show_on_home,sort_order')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });

        if (error && adatbazisOszlopHiany(error, ['service_category', 'customer_scope'])) {
            ({ data, error } = await allapot.kliens
                .from('coupons')
                .select('id,code,title,description,discount_type,discount_value,discount_text,service_id,valid_from,valid_until,active,show_on_home,sort_order')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true }));
        }

        if (error) {
            allapot.kuponok = [];
            elemek.kuponLista.innerHTML = `<p class="admin-ures">A kuponkezel\u00e9shez futtasd a <code>supabase-coupons.sql</code> f\u00e1jlt Supabase-ben.</p>`;
            if (!hianyzoKuponTabla(error)) onlineStatusz('Nem siker\u00fclt bet\u00f6lteni a kuponokat.', true);
            return;
        }

        allapot.kuponok = data || [];
        elemek.kuponLista.innerHTML = '';

        if (!allapot.kuponok.length) {
            elemek.kuponLista.innerHTML = '<p class="admin-ures">M\u00e9g nincs kupon. Hozz l\u00e9tre egyet az \u00daj kupon gombbal.</p>';
            return;
        }

        allapot.kuponok.forEach(kupon => elemek.kuponLista.appendChild(kuponKartya(kupon)));
    }

    function kuponKartya(kupon) {
        const ujKupon = String(kupon.title || '').trim().toLowerCase() === 'új kupon';
        const ervenyesseg = [kupon.valid_from, kupon.valid_until].filter(Boolean).join(' – ') || 'Nincs dátumkorlát';
        const kartya = document.createElement('article');
        kartya.className = `admin-db-kartya admin-kupon-kartya admin-szerkesztheto-kartya${ujKupon ? ' szerkeszt' : ''}`;
        kartya.dataset.id = kupon.id;

        kartya.innerHTML = `
            <div class="admin-kompakt-kartya-fej">
                <div class="admin-kompakt-kartya-osszefoglalo">
                    <span class="admin-kartya-tipus">Kupon</span>
                    <h3>${html(kupon.code || 'Kód nélkül')}</h3>
                    <p>${html(kupon.title || 'Névtelen kupon')} · ${html(kupon.discount_text || `${Number(kupon.discount_value) || 0}`)} · ${html(ervenyesseg)}</p>
                </div>
                <div class="admin-kompakt-kartya-vezerlok">
                    <span class="admin-allapot-jelzo${kupon.active ? '' : ' inaktiv'}">${kupon.active ? 'Aktív' : 'Inaktív'}</span>
                    ${kupon.show_on_home ? '<span class="admin-allapot-jelzo">Főoldalon</span>' : ''}
                    <button type="button" class="admin-kis-gomb admin-ikonos-gomb" data-admin-kartya-toggle aria-expanded="${String(ujKupon)}">${adminV2Ikon(ujKupon ? 'close' : 'edit')}<span>${ujKupon ? 'Bezárás' : 'Szerkesztés'}</span></button>
                </div>
            </div>
            <div class="admin-kompakt-szerkeszto">
                <div class="admin-db-grid admin-db-grid-kupon">
                    <label class="admin-mezo admin-kupon-kod">Kuponkód<input type="text" data-mezo="code" value="${attr(kupon.code || '')}"></label>
                    <label class="admin-mezo admin-kupon-cim">Cím<input type="text" data-mezo="title" value="${attr(kupon.title || '')}"></label>
                    <label class="admin-mezo admin-kupon-leiras">Leírás<textarea data-mezo="description" rows="3">${html(kupon.description || '')}</textarea></label>
                    <label class="admin-mezo admin-kupon-tipus">Kedvezmény típusa<select data-mezo="discount_type">${kuponTipusOptions(kupon.discount_type)}</select></label>
                    <label class="admin-mezo admin-kupon-ertek">Érték<input type="number" min="0" step="1" data-mezo="discount_value" value="${Number(kupon.discount_value) || 0}"></label>
                    <label class="admin-mezo admin-kupon-szoveg">Megjelenő szöveg<input type="text" data-mezo="discount_text" value="${attr(kupon.discount_text || '')}"></label>
                    <label class="admin-mezo admin-kupon-szolgaltatas">Érvényesség<select data-mezo="service_scope">${kuponSzolgaltatasOptions(kupon)}</select></label>
                    <label class="admin-mezo admin-kupon-celkozonseg">Kinek érvényes?<select data-mezo="customer_scope">${kuponKozonsegOptions(kupon.customer_scope)}</select></label>
                    <label class="admin-mezo admin-kupon-datum">Érvényes ettől<input type="date" data-mezo="valid_from" value="${attr(kupon.valid_from || '')}"></label>
                    <label class="admin-mezo admin-kupon-datum">Érvényes eddig<input type="date" data-mezo="valid_until" value="${attr(kupon.valid_until || '')}"></label>
                    <label class="admin-mezo admin-checkbox admin-kupon-checkbox"><input type="checkbox" data-mezo="active" ${kupon.active ? 'checked' : ''}> Aktív</label>
                    <label class="admin-mezo admin-checkbox admin-kupon-checkbox"><input type="checkbox" data-mezo="show_on_home" ${kupon.show_on_home ? 'checked' : ''}> Főoldali kártya</label>
                    <label class="admin-mezo admin-kupon-sorrend">Sorrend<input type="number" step="1" data-mezo="sort_order" value="${Number(kupon.sort_order) || 0}"></label>
                </div>
                <div class="admin-db-akciok admin-kupon-akciok">
                    <button type="button" class="admin-kis-gomb admin-ikonos-gomb" data-kupon-mozgat="fel">${adminV2Ikon('up')}<span>Feljebb</span></button>
                    <button type="button" class="admin-kis-gomb admin-ikonos-gomb" data-kupon-mozgat="le">${adminV2Ikon('down')}<span>Lejjebb</span></button>
                    <button type="button" class="admin-kis-gomb admin-veszely-gomb admin-ikonos-gomb" data-kupon-torles>${adminV2Ikon('trash')}<span>Törlés</span></button>
                </div>
            </div>
        `;
        return kartya;
    }

    function kuponTipusOptions(aktiv) {
        return [
            ['percent', 'Sz\u00e1zal\u00e9k (%)'],
            ['fixed', 'Fix \u00f6sszeg (Ft)'],
            ['text', 'Csak sz\u00f6veges akci\u00f3']
        ].map(([ertek, cimke]) => `<option value="${ertek}" ${ertek === aktiv ? 'selected' : ''}>${cimke}</option>`).join('');
    }

    function kuponKozonsegOptions(aktiv = 'all') {
        const ertek = ['all', 'new_customer'].includes(String(aktiv || 'all')) ? String(aktiv || 'all') : 'all';
        return [
            ['all', 'Mindenkinek'],
            ['new_customer', 'Csak \u00faj vend\u00e9gnek']
        ].map(([value, cimke]) => `<option value="${value}" ${value === ertek ? 'selected' : ''}>${cimke}</option>`).join('');
    }

    function kuponSzolgaltatasOptions(kupon = {}) {
        const aktivErtek = kuponScopeAktivErtek(kupon);
        const opciok = [
            `<option value="all" ${aktivErtek === 'all' ? 'selected' : ''}>Minden szolg\u00e1ltat\u00e1s</option>`,
            `<option value="category:D\u00edsz\u00edt\u00e9s" ${aktivErtek === 'category:D\u00edsz\u00edt\u00e9s' ? 'selected' : ''}>Extra d\u00edsz\u00edt\u00e9s b\u00e1rmely foglalhat\u00f3 szolg\u00e1ltat\u00e1s mell\u00e9</option>`
        ];
        const kategoriak = SZOLGALTATAS_KUPON_KATEGORIAK.filter(kategoria =>
            kategoria !== 'D\u00edsz\u00edt\u00e9s'
            && allapot.szolgaltatasok.some(szolgaltatas =>
                szolgaltatas.booking_enabled
                && szolgaltatasKuponKategoria(szolgaltatas) === kategoria
            )
        );

        if (kategoriak.length) {
            opciok.push('<optgroup label="Foglalhat\u00f3 kateg\u00f3ri\u00e1k">');
            kategoriak.forEach(kategoria => {
                const ertek = `category:${kategoria}`;
                opciok.push(`<option value="${attr(ertek)}" ${aktivErtek === ertek ? 'selected' : ''}>${html(kategoria)} kateg\u00f3ria</option>`);
            });
            opciok.push('</optgroup>');
        }

        const foglalhatoSzolgaltatasok = allapot.szolgaltatasok.filter(szolgaltatas =>
            szolgaltatas.booking_enabled
            && szolgaltatasKuponKategoria(szolgaltatas) !== 'D\u00edsz\u00edt\u00e9s'
        );
        if (foglalhatoSzolgaltatasok.length) {
            opciok.push('<optgroup label="Konkr\u00e9t foglalhat\u00f3 t\u00e9telek">');
            foglalhatoSzolgaltatasok.forEach(szolgaltatas => {
                const ertek = `service:${szolgaltatas.id}`;
                opciok.push(`<option value="${attr(ertek)}" ${aktivErtek === ertek ? 'selected' : ''}>${html(szolgaltatas.name || '')}</option>`);
            });
            opciok.push('</optgroup>');
        }

        return opciok.join('');
    }

    function kuponScopeAktivErtek(kupon = {}) {
        if (kupon.service_id) {
            const szolgaltatas = allapot.szolgaltatasok.find(tetel => tetel.id === kupon.service_id);
            if (szolgaltatasKuponKategoria(szolgaltatas) === 'D\u00edsz\u00edt\u00e9s') {
                return 'category:D\u00edsz\u00edt\u00e9s';
            }
            return `service:${kupon.service_id}`;
        }
        if (kupon.service_category) return `category:${kupon.service_category}`;
        return 'all';
    }
    function kuponScopePayload(scope) {
        const payload = { service_id: null, service_category: null };
        const ertek = String(scope || 'all');
        if (ertek.startsWith('service:')) payload.service_id = ertek.slice('service:'.length) || null;
        if (ertek.startsWith('category:')) payload.service_category = ertek.slice('category:'.length) || null;
        return payload;
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

    async function kuponHozzaadas() {
        onlineStatusz('\u00daj kupon l\u00e9trehoz\u00e1sa...');
        const ujKupon = {
            code: `LUMI${Math.floor(Math.random() * 90 + 10)}`,
            title: '\u00daj kupon',
            description: 'R\u00f6vid akci\u00f3s le\u00edr\u00e1s, ami a f\u0151oldalon is megjelenhet.',
            discount_type: 'percent',
            discount_value: 10,
            discount_text: '10% kedvezm\u00e9ny',
            customer_scope: 'all',
            active: false,
            show_on_home: true,
            sort_order: 999
        };

        let { error } = await allapot.kliens.from('coupons').insert(ujKupon);

        if (error && adatbazisOszlopHiany(error, ['customer_scope'])) {
            const kompatibilisKupon = { ...ujKupon };
            delete kompatibilisKupon.customer_scope;
            ({ error } = await allapot.kliens.from('coupons').insert(kompatibilisKupon));
            if (!error) {
                onlineStatusz('\u00daj kupon l\u00e9trehozva, de az \u00faj vend\u00e9g kuponmez\u0151h\u00f6z futtasd a friss Supabase SQL-t.', true);
                kuponokBetoltese();
                return;
            }
        }

        if (error) {
            onlineStatusz('Nem siker\u00fclt l\u00e9trehozni a kupont. Futtasd a supabase-coupons.sql f\u00e1jlt.', true);
            return;
        }

        onlineStatusz('\u00daj kupon l\u00e9trehozva.');
        kuponokBetoltese();
    }

    async function kuponListaKattintas(event) {
        const kartya = event.target.closest('.admin-kupon-kartya');
        if (!kartya) return;

        const szerkesztes = event.target.closest('[data-admin-kartya-toggle]');
        if (szerkesztes) {
            adminKartyaSzerkesztesKapcsolasa(kartya, szerkesztes);
            return;
        }

        const mozgatas = event.target.closest('[data-kupon-mozgat]');
        if (mozgatas) {
            kuponMozgatasa(kartya, mozgatas.dataset.kuponMozgat);
            return;
        }

        if (event.target.closest('[data-kupon-torles]')) {
            if (!window.confirm('Biztosan törlöd ezt a kupont? Törlés előtt automatikusan inaktiválom, hogy ne maradjon kint a főoldalon.')) return;
            await kuponTorlese(kartya.dataset.id);
        }
    }

    async function kuponTorlese(id) {
        onlineStatusz('Kupon inaktiválása és törlése...');

        const { error: inaktivHiba } = await allapot.kliens
            .from('coupons')
            .update({ active: false, show_on_home: false })
            .eq('id', id);

        if (inaktivHiba) {
            onlineStatusz('Nem sikerült inaktiválni a kupont, ezért nem töröltem.', true);
            return;
        }

        const { error } = await allapot.kliens
            .from('coupons')
            .delete()
            .eq('id', id);

        if (error) {
            onlineStatusz('A kupont inaktiváltam, de törölni nem sikerült. Így már nem jelenik meg az oldalon.', true);
            await kuponokBetoltese();
            return;
        }

        onlineStatusz('Kupon törölve.');
        await kuponokBetoltese();
    }

    function kuponMozgatasa(kartya, irany) {
        const lista = kartya.parentElement;
        const csere = irany === 'fel' ? kartya.previousElementSibling : kartya.nextElementSibling;
        if (!lista || !csere || !csere.classList.contains('admin-kupon-kartya')) return;

        if (irany === 'fel') lista.insertBefore(kartya, csere);
        else lista.insertBefore(csere, kartya);

        Array.from(lista.querySelectorAll('.admin-kupon-kartya')).forEach((elem, index) => {
            const sorrend = mezo(elem, 'sort_order');
            if (sorrend) sorrend.value = String((index + 1) * 10);
        });
        onlineStatusz('A kupon sorrend módosult. A véglegesítéshez nyomd meg a Mentés gombot.');
    }

    async function kuponokMentese() {
        const kartyak = Array.from(document.querySelectorAll('#admin-kupon-lista .admin-kupon-kartya'));
        if (!kartyak.length) {
            onlineStatusz('Nincs menthet\u0151 kupon.');
            return;
        }

        onlineStatusz('Kuponok ment\u00e9se...');

        for (const kartya of kartyak) {
            const kod = mezo(kartya, 'code').value.trim().toUpperCase();
            if (!kod) {
                onlineStatusz('Minden kuponn\u00e1l k\u00f6telez\u0151 a kuponk\u00f3d.', true);
                mezo(kartya, 'code').focus();
                return;
            }

            const payload = {
                code: kod,
                title: mezo(kartya, 'title').value.trim(),
                description: mezo(kartya, 'description').value.trim(),
                discount_type: mezo(kartya, 'discount_type').value,
                discount_value: szamMezo(kartya, 'discount_value'),
                discount_text: mezo(kartya, 'discount_text').value.trim(),
                customer_scope: mezo(kartya, 'customer_scope')?.value === 'new_customer' ? 'new_customer' : 'all',
                ...kuponScopePayload(mezo(kartya, 'service_scope')?.value),
                valid_from: mezo(kartya, 'valid_from').value || null,
                valid_until: mezo(kartya, 'valid_until').value || null,
                active: mezo(kartya, 'active').checked,
                show_on_home: mezo(kartya, 'show_on_home').checked,
                sort_order: szamMezo(kartya, 'sort_order')
            };

            let { error } = await allapot.kliens
                .from('coupons')
                .update(payload)
                .eq('id', kartya.dataset.id);

            if (error && adatbazisOszlopHiany(error, ['service_category', 'customer_scope'])) {
                const kompatibilisPayload = { ...payload };
                if (adatbazisOszlopHiany(error, ['service_category'])) delete kompatibilisPayload.service_category;
                if (adatbazisOszlopHiany(error, ['customer_scope'])) delete kompatibilisPayload.customer_scope;
                ({ error } = await allapot.kliens
                    .from('coupons')
                    .update(kompatibilisPayload)
                    .eq('id', kartya.dataset.id));
                if (!error) {
                    onlineStatusz('Kuponok mentve, de az \u00faj vend\u00e9g / kateg\u00f3ri\u00e1s kuponmez\u0151kh\u00f6z futtasd a friss supabase-coupons.sql-t.', true);
                }
            }

            if (error) {
                onlineStatusz('Nem siker\u00fclt menteni az egyik kupont.', true);
                return;
            }
        }

        onlineStatusz('Kuponok mentve.');
        kuponokBetoltese();
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
            <div class="admin-idosav-grid">
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

    function tiltasStatuszErtek(statusz) {
        const ertek = String(statusz || '').toLowerCase();
        return ['done', 'cancelled_by_customer'].includes(ertek) ? ertek : 'blocked';
    }

    async function tiltasokBetoltese() {
        const elemek = adminElemek();
        let { data, error } = await allapot.kliens
            .from('blocked_times')
            .select('id,starts_at,ends_at,reason,status')
            .order('starts_at', { ascending: false })
            .limit(200);

        if (error && adatbazisOszlopHiany(error, ['status'])) {
            allapot.tiltasStatuszTamogatott = false;
            ({ data, error } = await allapot.kliens
                .from('blocked_times')
                .select('id,starts_at,ends_at,reason')
                .order('starts_at', { ascending: false })
                .limit(200));
        } else if (!error) {
            allapot.tiltasStatuszTamogatott = true;
        }

        if (error) {
            onlineStatusz('Nem sikerült betölteni a foglalt időket.', true);
            return;
        }

        elemek.tiltasLista.innerHTML = '';

        if (!data.length) {
            elemek.tiltasLista.innerHTML = '<p class="admin-ures">Nincs külön felvett foglalt idő.</p>';
            return;
        }

        data.forEach(tiltas => elemek.tiltasLista.appendChild(tiltasKartya({
            ...tiltas,
            status: tiltasStatuszErtek(tiltas.status)
        })));
    }

    function tiltasKartya(tiltas) {
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya';
        kartya.dataset.id = tiltas.id;
        const megjegyzes = tiltas.reason?.trim() || 'Kézi foglalás';
        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div>
                    <span class="admin-kartya-tipus">Kézzel felvett idő</span>
                    <h3>${html(megjegyzes)}</h3>
                    <p>${html(datumIdoRovid(tiltas.starts_at))} - ${html(datumIdoRovid(tiltas.ends_at, true))}</p>
                </div>
                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-tiltas-torles>Törlés</button>
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

        onlineStatusz('Kézi foglalt idő mentése...');

        const ujTiltas = {
            starts_at: helyiDatumIdoIso(elemek.tiltasDatum.value, elemek.tiltasKezdes.value),
            ends_at: helyiDatumIdoIso(elemek.tiltasDatum.value, elemek.tiltasVege.value),
            reason: megjegyzes,
            status: 'blocked'
        };

        const utkozesHiba = await idopontUtkozesHiba({
            tipus: 'blocked',
            nev: megjegyzes,
            startsAt: ujTiltas.starts_at,
            endsAt: ujTiltas.ends_at,
            statusz: ujTiltas.status
        });

        if (utkozesHiba) {
            onlineStatusz(utkozesHiba, true);
            return;
        }

        let { error } = await allapot.kliens.from('blocked_times').insert(ujTiltas);

        if (error && adatbazisOszlopHiany(error, ['status'])) {
            allapot.tiltasStatuszTamogatott = false;
            const { status: _status, ...regiSemaAdat } = ujTiltas;
            ({ error } = await allapot.kliens.from('blocked_times').insert(regiSemaAdat));
        }

        if (error) {
            onlineStatusz('Nem sikerült menteni a kézi foglalt időt.', true);
            return;
        }

        elemek.tiltasForm.reset();
        idosavAlapertelmezes(adminElemek());
        onlineStatusz('A kézi foglalt idő mentve. A státuszát a Foglalások nézetben módosíthatod.');
        tiltasokBetoltese();
        foglalasokBetoltese();
    }
    async function tiltasListaKattintas(event) {
        const kartya = event.target.closest('.admin-db-kartya');

        if (!kartya || !event.target.closest('[data-tiltas-torles]')) {
            return;
        }

        await rekordTorlese('blocked_times', kartya.dataset.id, () => {
            tiltasokBetoltese();
            foglalasokBetoltese();
        });
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
        const aktivTab = allapot.aktivTab;
        const mentesFeliratok = {
            foglalasok: 'Módosítások mentése',
            szolgaltatasok: 'Árlista mentése',
            kuponok: 'Kuponok mentése',
            idosavok: 'Dátumok mentése',
            tiltasok: 'Új kézi idő mentése',
            esemenynaplo: 'Napló frissítése',
            emailteszt: 'E-mail tesztek küldése',
            szovegek: 'Tartalom mentése'
        };

        document.querySelectorAll('.admin-tab').forEach(gomb => {
            const aktiv = gomb.dataset.adminTab === aktivTab;
            gomb.classList.toggle('aktiv', aktiv);
            gomb.setAttribute('role', 'tab');
            gomb.setAttribute('aria-selected', String(aktiv));
        });

        document.querySelectorAll('.admin-db-panel').forEach(panel => {
            const aktiv = panel.id === `admin-panel-${aktivTab}`;
            panel.classList.toggle('aktiv', aktiv);
            panel.setAttribute('aria-hidden', String(!aktiv));
        });

        const mentes = adminElemek().lebegoMentes;
        if (mentes) {
            mentes.textContent = mentesFeliratok[aktivTab] || 'Mentés';
            mentes.setAttribute('aria-label', mentes.textContent);
            mentes.hidden = aktivTab === 'emailteszt' || !allapot.session;
        }
    }
    async function emailTesztekKuldese() {
        const elemek = adminElemek();
        const gomb = elemek.emailTesztKuldes;
        const token = allapot.session?.access_token || '';

        if (!gomb || !token) {
            emailTesztStatusz('A teszt e-mailek k\u00fcld\u00e9s\u00e9hez jelentkezz be \u00fajra.', true);
            onlineStatusz('A munkamenet lej\u00e1rt. Jelentkezz be \u00fajra.', true);
            return;
        }

        const jovahagyva = window.confirm(
            'A rendszer 9 teszt e-mailt k\u00fcld a luminails.xx@gmail.com c\u00edmre. Folytatod?'
        );

        if (!jovahagyva) {
            return;
        }

        const eredetiFelirat = gomb.textContent;
        gomb.disabled = true;
        gomb.textContent = 'K\u00fcld\u00e9s folyamatban\u2026';
        emailTesztStatusz('A 9 teszt e-mail k\u00fcld\u00e9se folyamatban van. Ez n\u00e9h\u00e1ny m\u00e1sodpercet ig\u00e9nybe vehet.');

        try {
            const { data, error } = await allapot.kliens.functions.invoke('send-email-previews', {
                body: { request_source: 'admin' },
                headers: {
                    Authorization: 'Bearer ' + token
                }
            });

            if (error) {
                throw new Error(await edgeFunctionHibaUzenet(error));
            }

            const elkuldve = Number(data?.sent || 0);
            const hibas = Number(data?.failed || 0);

            if (!data?.ok || hibas > 0 || elkuldve !== 9) {
                const reszletek = Array.isArray(data?.delivery)
                    ? data.delivery.filter(item => !item.ok).map(item => item.label || item.type).filter(Boolean).join(', ')
                    : '';
                throw new Error(
                    reszletek
                        ? 'Nem ment ki minden teszt e-mail. Hib\u00e1s: ' + reszletek + '.'
                        : 'Csak ' + elkuldve + ' / 9 teszt e-mail ment ki.'
                );
            }

            const cimzett = data.recipient || 'luminails.xx@gmail.com';
            const uzenet = 'Mind a 9 teszt e-mail elk\u00fcldve a ' + cimzett + ' c\u00edmre.';
            emailTesztStatusz(uzenet);
            onlineStatusz(uzenet);
        } catch (error) {
            const uzenet = error instanceof Error ? error.message : 'Nem siker\u00fclt elk\u00fcldeni a teszt e-maileket.';
            emailTesztStatusz(uzenet, true);
            onlineStatusz(uzenet, true);
        } finally {
            gomb.disabled = false;
            gomb.textContent = eredetiFelirat;
        }
    }

    async function edgeFunctionHibaUzenet(error) {
        const context = error?.context;

        if (context && typeof context.clone === 'function') {
            try {
                const valasz = await context.clone().json();
                if (valasz?.error) {
                    return String(valasz.error);
                }
            } catch (_hiba) {
                // A Supabase kliens alap hiba\u00fczenete marad.
            }
        }

        return String(error?.message || 'A Supabase e-mail tesztfunkci\u00f3 nem \u00e9rhet\u0151 el.');
    }

    function emailTesztStatusz(szoveg, hiba = false) {
        const elem = adminElemek().emailTesztStatusz;

        if (!elem) {
            return;
        }

        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
        elem.setAttribute('role', hiba ? 'alert' : 'status');
    }

    function adminKartyaSzerkesztesKapcsolasa(kartya, gomb) {
        const nyitva = !kartya.classList.contains('szerkeszt');
        kartya.classList.toggle('szerkeszt', nyitva);
        gomb.innerHTML = `${adminV2Ikon(nyitva ? 'close' : 'edit')}<span>${nyitva ? 'Bezárás' : 'Szerkesztés'}</span>`;
        gomb.setAttribute('aria-expanded', String(nyitva));
    }

    async function idopontUtkozesHiba({ tipus, id = '', nev = '', startsAt, endsAt, statusz }) {
        const aktivBejegyzes = tipus === 'booking'
            ? ['pending', 'confirmed', 'done'].includes(statusz)
            : tiltasStatuszErtek(statusz) !== 'cancelled_by_customer';

        if (!aktivBejegyzes) {
            return '';
        }

        const sajatNev = nev.trim() || (tipus === 'booking' ? 'Név nélküli vendég' : 'Név nélküli kézi idő');
        let bookingQuery = allapot.kliens
            .from('bookings')
            .select('id,customer_name')
            .in('status', ['pending', 'confirmed', 'done'])
            .lt('starts_at', endsAt)
            .gt('ends_at', startsAt)
            .limit(1);

        if (tipus === 'booking' && id) {
            bookingQuery = bookingQuery.neq('id', id);
        }

        const { data: foglalasUtkozes, error: foglalasHiba } = await bookingQuery;

        if (foglalasHiba) {
            return 'Nem sikerült ellenőrizni az időpont ütközést.';
        }

        if (foglalasUtkozes?.length) {
            const masikNev = foglalasUtkozes[0].customer_name?.trim() || 'Név nélküli vendég';
            const sajatTipus = tipus === 'booking' ? 'foglalása' : 'kézi ideje';
            return `Nem menthető: „${sajatNev}” ${sajatTipus} ütközik „${masikNev}” foglalásával.`;
        }

        const tiltasQuery = statuszOszloppal => {
            let query = allapot.kliens
                .from('blocked_times')
                .select(statuszOszloppal ? 'id,reason,status' : 'id,reason')
                .lt('starts_at', endsAt)
                .gt('ends_at', startsAt)
                .limit(1);

            if (statuszOszloppal) {
                query = query.neq('status', 'cancelled_by_customer');
            }

            if (tipus === 'blocked' && id) {
                query = query.neq('id', id);
            }

            return query;
        };

        let { data: tiltasUtkozes, error: tiltasHiba } = await tiltasQuery(allapot.tiltasStatuszTamogatott);
        if (tiltasHiba && adatbazisOszlopHiany(tiltasHiba, ['status'])) {
            allapot.tiltasStatuszTamogatott = false;
            ({ data: tiltasUtkozes, error: tiltasHiba } = await tiltasQuery(false));
        }

        if (tiltasHiba) {
            return 'Nem sikerült ellenőrizni a kézzel felvett foglalt időket.';
        }

        if (tiltasUtkozes?.length) {
            const masikNev = tiltasUtkozes[0].reason?.trim() || 'Név nélküli kézi idő';
            const sajatTipus = tipus === 'booking' ? 'foglalása' : 'kézi ideje';
            return `Nem menthető: „${sajatNev}” ${sajatTipus} ütközik az „${masikNev}” kézzel felvett idővel.`;
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

    function datumIdoRovid(ertek, csakIdo = false) {
        const datum = new Date(ertek);
        const nap = String(datum.getDate()).padStart(2, '0');
        const honap = String(datum.getMonth() + 1).padStart(2, '0');
        const ev = String(datum.getFullYear()).slice(-2);
        const ora = String(datum.getHours()).padStart(2, '0');
        const perc = String(datum.getMinutes()).padStart(2, '0');
        return csakIdo ? `${ora}:${perc}` : `${nap}/${honap}/${ev} ${ora}:${perc}`;
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

        window.clearTimeout(onlineStatusz.elrejtesIdozito);
        window.clearTimeout(onlineStatusz.uritesIdozito);
        window.cancelAnimationFrame(onlineStatusz.megjelenitesKeret);
        elem.classList.remove('admin-toast-lathato');

        if (!szoveg) {
            elem.textContent = '';
            elem.classList.remove('hiba');
            return;
        }

        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
        elem.setAttribute('role', hiba ? 'alert' : 'status');
        elem.setAttribute('aria-live', hiba ? 'assertive' : 'polite');

        onlineStatusz.megjelenitesKeret = window.requestAnimationFrame(() => {
            elem.classList.add('admin-toast-lathato');
        });

        onlineStatusz.elrejtesIdozito = window.setTimeout(() => {
            elem.classList.remove('admin-toast-lathato');
            onlineStatusz.uritesIdozito = window.setTimeout(() => {
                if (!elem.classList.contains('admin-toast-lathato')) {
                    elem.textContent = '';
                    elem.classList.remove('hiba');
                }
            }, 220);
        }, 5000);
    }

    window.lumiAdminStatusz = onlineStatusz;

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

(() => {
    const GALLERY_GROUP = '7';
    let galleryMode = false;
    let internalSwitch = false;
    let refreshQueued = false;

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

            if (!internalSwitch && event.target.closest('[data-cms-view]')) {
                galleryMode = false;
                queueRefresh(root);
            }
        }, true);

        root.addEventListener('change', event => {
            const sectionSelect = event.target.closest('[data-cms-section-select]');
            if (!sectionSelect || internalSwitch) return;
            if (galleryMode && sectionSelect.value !== GALLERY_GROUP) galleryMode = false;
            queueRefresh(root);
        }, true);

        const observer = new MutationObserver(() => queueRefresh(root));
        observer.observe(root, { childList: true, subtree: true });
        queueRefresh(root);
    });

    function openGallery(root) {
        galleryMode = true;
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
        }
    }
})();

(() => {
    const INTERAKTIV = 'button, a, input, select, textarea, label, [role="button"], [contenteditable="true"]';

    document.addEventListener('DOMContentLoaded', () => {
        const lista = document.getElementById('admin-foglalas-lista');
        if (!lista) return;

        lista.addEventListener('click', event => {
            const kartya = event.target.closest('.admin-foglalas-kartya');
            if (!kartya || !lista.contains(kartya) || event.target.closest(INTERAKTIV)) return;
            if (kartya.classList.contains('szerkeszt')) return;

            const reszletekGomb = kartya.querySelector('[data-foglalas-reszletek]');
            if (!reszletekGomb) return;

            reszletekGomb.click();
            window.requestAnimationFrame(() => kartyaAriaFrissitese(kartya));
        });

        lista.addEventListener('keydown', event => {
            const kartya = event.target.closest('.admin-foglalas-kartya');
            if (!kartya || event.target !== kartya || kartya.classList.contains('szerkeszt')) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;

            const reszletekGomb = kartya.querySelector('[data-foglalas-reszletek]');
            if (!reszletekGomb) return;

            event.preventDefault();
            reszletekGomb.click();
            window.requestAnimationFrame(() => kartyaAriaFrissitese(kartya));
        });

        const observer = new MutationObserver(() => {
            lista.querySelectorAll('.admin-foglalas-kartya').forEach(kartyaElokeszitese);
        });
        observer.observe(lista, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        lista.querySelectorAll('.admin-foglalas-kartya').forEach(kartyaElokeszitese);
    });

    function kartyaElokeszitese(kartya) {
        const reszletekGomb = kartya.querySelector('[data-foglalas-reszletek]');
        if (!reszletekGomb) return;
        if (!kartya.hasAttribute('tabindex')) kartya.tabIndex = 0;
        if (!kartya.classList.contains('admin-foglalas-kartya-kattinthato')) {
            kartya.classList.add('admin-foglalas-kartya-kattinthato');
        }
        kartyaAriaFrissitese(kartya);
    }

    function kartyaAriaFrissitese(kartya) {
        const nyitott = kartya.classList.contains('admin-foglalas-kartya-nyitott');
        kartya.setAttribute('aria-expanded', String(nyitott));
        kartya.setAttribute('aria-label', nyitott ? 'Foglalás részleteinek bezárása' : 'Foglalás részleteinek megnyitása');
    }
})();
