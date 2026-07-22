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
        const kartya = document.createElement('article');
        kartya.className = 'admin-db-kartya admin-kupon-kartya';
        kartya.dataset.id = kupon.id;

        kartya.innerHTML = `
            <div class="admin-db-grid admin-db-grid-kupon">
                <label class="admin-mezo admin-kupon-kod">Kuponk\u00f3d<input type="text" data-mezo="code" value="${attr(kupon.code || '')}" placeholder="pl. LUMI10"></label>
                <label class="admin-mezo admin-kupon-cim">C\u00edm<input type="text" data-mezo="title" value="${attr(kupon.title || '')}" placeholder="pl. 10% kedvezm\u00e9ny \u00faj vend\u00e9geknek"></label>
                <label class="admin-mezo admin-kupon-leiras">Le\u00edr\u00e1s<textarea data-mezo="description" rows="3" placeholder="Ez jelenik meg a f\u0151oldali akci\u00f3s k\u00e1rty\u00e1n.">${html(kupon.description || '')}</textarea></label>
                <label class="admin-mezo admin-kupon-tipus">Kedvezm\u00e9ny t\u00edpusa<select data-mezo="discount_type">${kuponTipusOptions(kupon.discount_type)}</select></label>
                <label class="admin-mezo admin-kupon-ertek">\u00c9rt\u00e9k<input type="number" min="0" step="1" data-mezo="discount_value" value="${Number(kupon.discount_value) || 0}"></label>
                <label class="admin-mezo admin-kupon-szoveg">Megjelen\u0151 sz\u00f6veg<input type="text" data-mezo="discount_text" value="${attr(kupon.discount_text || '')}" placeholder="pl. 10% kedvezm\u00e9ny"></label>
                <label class="admin-mezo admin-kupon-szolgaltatas">\u00c9rv\u00e9nyess\u00e9g<select data-mezo="service_scope">${kuponSzolgaltatasOptions(kupon)}</select></label>
                <label class="admin-mezo admin-kupon-celkozonseg">Kinek \u00e9rv\u00e9nyes?<select data-mezo="customer_scope">${kuponKozonsegOptions(kupon.customer_scope)}</select></label>
                <label class="admin-mezo admin-kupon-datum">\u00c9rv\u00e9nyes ett\u0151l<input type="date" data-mezo="valid_from" value="${attr(kupon.valid_from || '')}"></label>
                <label class="admin-mezo admin-kupon-datum">\u00c9rv\u00e9nyes eddig<input type="date" data-mezo="valid_until" value="${attr(kupon.valid_until || '')}"></label>
                <label class="admin-mezo admin-checkbox admin-kupon-checkbox"><input type="checkbox" data-mezo="active" ${kupon.active ? 'checked' : ''}> Akt\u00edv</label>
                <label class="admin-mezo admin-checkbox admin-kupon-checkbox"><input type="checkbox" data-mezo="show_on_home" ${kupon.show_on_home ? 'checked' : ''}> F\u0151oldali k\u00e1rtya</label>
                <label class="admin-mezo admin-kupon-sorrend">Sorrend<input type="number" step="1" data-mezo="sort_order" value="${Number(kupon.sort_order) || 0}"></label>
            </div>
            <div class="admin-db-akciok admin-kupon-akciok">
                <button type="button" class="admin-kis-gomb" data-kupon-mozgat="fel" aria-label="Kupon feljebb">\u2191 Feljebb</button>
                <button type="button" class="admin-kis-gomb" data-kupon-mozgat="le" aria-label="Kupon lejjebb">\u2193 Lejjebb</button>
                <button type="button" class="admin-kis-gomb admin-veszely-gomb" data-kupon-torles>T\u00f6rl\u00e9s</button>
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
        const opciok = [`<option value="all" ${aktivErtek === 'all' ? 'selected' : ''}>Minden szolg\u00e1ltat\u00e1s</option>`];
        const kategoriak = SZOLGALTATAS_KUPON_KATEGORIAK.filter(kategoria =>
            allapot.szolgaltatasok.some(szolgaltatas => szolgaltatasKuponKategoria(szolgaltatas) === kategoria)
        );

        if (kategoriak.length) {
            opciok.push('<optgroup label="Kateg\u00f3ri\u00e1k">');
            kategoriak.forEach(kategoria => {
                const ertek = `category:${kategoria}`;
                opciok.push(`<option value="${attr(ertek)}" ${aktivErtek === ertek ? 'selected' : ''}>${html(kategoria)} kateg\u00f3ria</option>`);
            });
            opciok.push('</optgroup>');
        }

        if (allapot.szolgaltatasok.length) {
            opciok.push('<optgroup label="Konkr\u00e9t t\u00e9telek">');
            allapot.szolgaltatasok.forEach(szolgaltatas => {
                const ertek = `service:${szolgaltatas.id}`;
                opciok.push(`<option value="${attr(ertek)}" ${aktivErtek === ertek ? 'selected' : ''}>${html(szolgaltatas.name || '')}</option>`);
            });
            opciok.push('</optgroup>');
        }

        return opciok.join('');
    }

    function kuponScopeAktivErtek(kupon = {}) {
        if (kupon.service_id) return `service:${kupon.service_id}`;
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
