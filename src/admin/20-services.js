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
                    <label class="admin-mezo admin-szolgaltatas-ar">Ár<input type="text" data-mezo="price_amount" value="${attr(szolgaltatas.price_value || '')}" placeholder="7000 vagy 500-800"></label>
                    <label class="admin-mezo admin-szolgaltatas-egyseg">Egység<input type="text" data-mezo="price_unit" value="${attr(szolgaltatas.price_unit || 'Ft')}" placeholder="Ft, Ft/db, Ft-tól"></label>
                    <label class="admin-mezo admin-szolgaltatas-ido">Óra<input type="number" min="0" step="1" data-mezo="ora" value="${ora}"></label>
                    <label class="admin-mezo admin-szolgaltatas-ido">Perc<input type="number" min="0" max="59" step="1" data-mezo="perc" value="${perc}"></label>
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

        let { error } = await allapot.kliens.from('services').insert(ujTetel);

        if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
            const { price_amount, price_unit, price_suffix, ...regiTetel } = ujTetel;
            ({ error } = await allapot.kliens.from('services').insert(regiTetel));
        }

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
