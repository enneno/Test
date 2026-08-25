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
