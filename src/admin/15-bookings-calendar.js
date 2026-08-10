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
