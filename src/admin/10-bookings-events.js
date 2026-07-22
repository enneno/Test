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
            .limit(120);

        if (foglalasHiba && hianyzoInspiracioOszlop(foglalasHiba)) {
            ({ data: foglalasok, error: foglalasHiba } = await allapot.kliens
                .from('bookings')
                .select(kuponSelect)
                .order('starts_at', { ascending: false })
                .limit(120));
        }

        if (foglalasHiba && hianyzoKuponOszlop(foglalasHiba)) {
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

    function foglalasSzurtElemek() {
        const kereses = normalizaltKereses(allapot.foglalasKereses);
        const telefonKereses = csakSzamok(allapot.foglalasKereses);
        const statuszSzuro = allapot.foglalasStatuszSzuro || 'all';

        if (!kereses && !telefonKereses && statuszSzuro === 'all') {
            return allapot.foglalasElemek;
        }

        return allapot.foglalasElemek.filter(elem => {
            const adat = elem.adat || {};
            const statuszTalalat = statuszSzuro === 'all'
                || statuszSzuro === 'blocked' && elem.tipus === 'blocked'
                || elem.tipus === 'booking' && String(adat.status || '').toLowerCase() === statuszSzuro;

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
                adat.note,
                adat.nail_style,
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

    function foglalasTabJelzesFrissitese() {
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
        return `
            <div class="admin-oldalmeret" role="group" aria-label="Foglal\u00e1sok oldalank\u00e9nt">
                <span>Oldalank\u00e9nt</span>
                ${oldalmeretGombok(allapot.foglalasOldalMeret, 'foglalas-oldalmeret')}
            </div>
            <button type="button" class="admin-kis-gomb" data-foglalas-oldal="elozo" ${allapot.foglalasOldal <= 1 || !vanElem ? 'disabled' : ''}>El\u0151z\u0151</button>
            <span>${vanElem ? `${allapot.foglalasOldal} / ${osszes}` : '0 / 0'}</span>
            <button type="button" class="admin-kis-gomb" data-foglalas-oldal="kovetkezo" ${allapot.foglalasOldal >= osszes || !vanElem ? 'disabled' : ''}>K\u00f6vetkez\u0151</button>
        `;
    }

    function foglalasLapozoRenderelese() {
        const elemek = adminElemek();
        const htmlTartalom = foglalasLapozoHtml();
        [elemek.foglalasLapozoFelso, elemek.foglalasLapozo].filter(Boolean).forEach(lapozo => {
            lapozo.innerHTML = htmlTartalom;
        });
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
            .select('id,booking_id,event_type,channel,status,title,message,metadata,created_at,bookings(customer_name,starts_at)')
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
            booking_review_request_email: 'Értékeléskérő email'
        }[tipus] || 'Esemény';
    }

    function foglalasKartya(foglalas) {
        const kartya = document.createElement('article');
        const fuggoben = foglalasFuggoben(foglalas);
        kartya.className = `admin-db-kartya${fuggoben ? ' admin-foglalas-fuggoben' : ''}`;
        kartya.dataset.id = foglalas.id;
        kartya.dataset.tipus = 'booking';
        kartya.dataset.eredetiStatusz = foglalas.status || '';
        kartya.dataset.eredetiDatum = datumInputErtek(foglalas.starts_at);
        kartya.dataset.eredetiKezdes = idoInputErtek(foglalas.starts_at);
        kartya.dataset.eredetiVege = idoInputErtek(foglalas.ends_at);
        const inspiracioKepek = foglalasInspiracioKepek(foglalas);
        const kuponKod = foglalasKuponKod(foglalas);
        const megjegyzes = foglalasMegjegyzesMegjelenites(foglalas);
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
                ${kuponKod ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles admin-foglalas-kupon"><strong>Kupon: ${html(kuponKod)}</strong></p>` : ''}
                ${megjegyzes ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles"><strong>Megjegyz\u00e9s:</strong> ${html(megjegyzes)}</p>` : ''}
                ${inspiracioKepek.length ? `<p class="admin-foglalas-reszlet-sor admin-foglalas-reszlet-szeles"><strong>Inspiráció:</strong> <button type="button" class="admin-inspiracio-link" data-inspiracio-megnyitas>${inspiracioKepek.length} kép megnyitása</button></p>` : ''}
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

    function foglalasMegjegyzesMegjelenites(foglalas) {
        const note = String(foglalas?.note || '').trim();
        if (!note) return '';

        return note
            .split(/\r?\n/)
            .map(sor => sor.trim())
            .filter(sor => sor && !/^(Kupon:|Alap\u00e1r:|Kedvezm\u00e9ny:|V\u00e9g\u00f6sszeg:)/i.test(sor))
            .join(' ')
            .replace(/\s*Kupon:\s*[A-Z0-9_-]+(?:\s*\([^)]*\))?(?:\s*Alap\u00e1r:[\s\S]*)?$/i, '')
            .replace(/\s*Alap\u00e1r:\s*[\s\S]*$/i, '')
            .replace(/\s*Kedvezm\u00e9ny:\s*[\s\S]*$/i, '')
            .replace(/\s*V\u00e9g\u00f6sszeg:\s*[\s\S]*$/i, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
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
        kartya.className = 'admin-db-kartya admin-db-kartya-tiltas';
        kartya.dataset.id = tiltas.id;
        kartya.dataset.tipus = 'blocked';
        const megjegyzes = tiltas.reason?.trim() || 'Kézi foglalás';
        kartya.innerHTML = `
            <div class="admin-db-kartya-fej">
                <div class="admin-foglalas-fosor">
                    <h3>${html(megjegyzes)}</h3>
                    <p class="admin-foglalas-idopont">${html(datumIdoRovid(tiltas.starts_at))} - ${html(datumIdoRovid(tiltas.ends_at, true))}</p>
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
                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-foglalas-torles>Eltávolítás</button>
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
