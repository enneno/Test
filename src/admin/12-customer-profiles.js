    function adminV2VendegPanelLetrehozasa(workspaceMain) {
        if (document.getElementById('admin-panel-vendegek')) return;

        const panel = document.createElement('section');
        panel.id = 'admin-panel-vendegek';
        panel.className = 'admin-db-panel admin-vendeg-panel';
        panel.innerHTML = `
            <div class="admin-v2-page-heading">
                <div>
                    <p class="admin-v2-kicker">Kapcsolatok és előzmények</p>
                    <h1>Vendégek</h1>
                    <p>A foglalásokból összeállított, csak admin számára elérhető vendégnézet.</p>
                </div>
                <div class="admin-v2-page-actions">
                    <button type="button" class="admin-v2-button admin-v2-button-secondary" data-vendeg-frissites>
                        ${adminV2Ikon('refresh')} Frissítés
                    </button>
                </div>
            </div>
            <div class="admin-vendeg-toolbar">
                <label class="admin-vendeg-kereses">
                    <span>Keresés</span>
                    <input type="search" data-vendeg-kereses placeholder="Név, email vagy telefonszám" autocomplete="off">
                </label>
                <p class="admin-vendeg-osszefoglalo" data-vendeg-osszefoglalo aria-live="polite">Betöltés…</p>
            </div>
            <div class="admin-vendeg-layout">
                <div class="admin-vendeg-lista" data-vendeg-lista aria-label="Vendégek listája">
                    <p class="admin-vendeg-ures">Vendégek betöltése…</p>
                </div>
                <aside class="admin-vendeg-reszlet" data-vendeg-reszlet aria-live="polite">
                    <div class="admin-vendeg-reszlet-ures">
                        <span>${adminV2Ikon('users')}</span>
                        <strong>Válassz egy vendéget</strong>
                        <p>Itt jelennek meg az elérhetőségei és a foglalási előzményei.</p>
                    </div>
                </aside>
            </div>
        `;

        workspaceMain.append(panel);

        panel.querySelector('[data-vendeg-frissites]')?.addEventListener('click', () => {
            vendegProfilokBetoltese(true);
        });
        panel.querySelector('[data-vendeg-kereses]')?.addEventListener('input', event => {
            allapot.vendegProfilKereses = event.target.value.trim();
            vendegProfilListaRenderelese();
        });
        panel.querySelector('[data-vendeg-lista]')?.addEventListener('click', event => {
            const button = event.target.closest('[data-admin-vendeg-id]');
            if (!button) return;
            allapot.aktivVendegProfil = button.dataset.adminVendegId || '';
            vendegProfilListaRenderelese();
            vendegProfilReszletBetoltese(allapot.aktivVendegProfil);
        });
        panel.querySelector('[data-vendeg-reszlet]')?.addEventListener('click', event => {
            const button = event.target.closest('[data-admin-vendeg-foglalasok]');
            if (!button) return;
            adminV2FoglalasKeresese(button.dataset.adminVendegFoglalasok || '');
        });
    }

    async function vendegProfilokBetoltese(kenyszeritett = false) {
        const panel = document.getElementById('admin-panel-vendegek');
        if (!panel || !allapot.kliens || !allapot.session) return;
        if (!kenyszeritett && allapot.vendegProfilok.length) {
            vendegProfilListaRenderelese();
            return;
        }

        const keresId = ++allapot.vendegProfilKeresId;
        const lista = panel.querySelector('[data-vendeg-lista]');
        const osszefoglalo = panel.querySelector('[data-vendeg-osszefoglalo]');
        if (lista) lista.innerHTML = '<p class="admin-vendeg-ures">Vendégek betöltése…</p>';
        if (osszefoglalo) osszefoglalo.textContent = 'Betöltés…';

        const { data, error } = await allapot.kliens
            .from('admin_customer_profiles')
            .select('*')
            .order('last_booking_at', { ascending: false });

        if (keresId !== allapot.vendegProfilKeresId) return;
        if (error) {
            if (lista) lista.innerHTML = '<p class="admin-vendeg-ures admin-vendeg-hiba">Nem sikerült betölteni a vendégeket.</p>';
            if (osszefoglalo) osszefoglalo.textContent = 'Betöltési hiba';
            onlineStatusz('Nem sikerült betölteni a vendégprofilokat.', true);
            return;
        }

        allapot.vendegProfilok = Array.isArray(data) ? data : [];
        if (!allapot.vendegProfilok.some(item => item.customer_key === allapot.aktivVendegProfil)) {
            allapot.aktivVendegProfil = allapot.vendegProfilok[0]?.customer_key || '';
        }
        vendegProfilListaRenderelese();
        if (allapot.aktivVendegProfil) vendegProfilReszletBetoltese(allapot.aktivVendegProfil);
    }

    function vendegProfilListaRenderelese() {
        const panel = document.getElementById('admin-panel-vendegek');
        const lista = panel?.querySelector('[data-vendeg-lista]');
        const osszefoglalo = panel?.querySelector('[data-vendeg-osszefoglalo]');
        if (!lista || !osszefoglalo) return;

        const keresett = vendegKeresesNormalizalasa(allapot.vendegProfilKereses);
        const profilok = allapot.vendegProfilok.filter(profile => {
            if (!keresett) return true;
            return [profile.customer_name, profile.customer_email, profile.customer_phone]
                .some(value => vendegKeresesNormalizalasa(value).includes(keresett));
        });

        osszefoglalo.textContent = keresett
            ? `${profilok.length} találat · ${allapot.vendegProfilok.length} vendégből`
            : `${allapot.vendegProfilok.length} vendég`;

        if (!profilok.length) {
            lista.innerHTML = `<p class="admin-vendeg-ures">${keresett ? 'Nincs a keresésnek megfelelő vendég.' : 'Még nincs megjeleníthető vendég.'}</p>`;
            return;
        }

        lista.innerHTML = profilok.map(profile => {
            const aktiv = profile.customer_key === allapot.aktivVendegProfil;
            const kovetkezo = profile.next_booking_at
                ? `Következő: ${html(vendegDatumIdo(profile.next_booking_at))}`
                : 'Nincs közelgő időpont';
            return `
                <button type="button" class="admin-vendeg-sor${aktiv ? ' is-active' : ''}"
                    data-admin-vendeg-id="${attr(profile.customer_key)}" aria-pressed="${String(aktiv)}">
                    <span class="admin-vendeg-monogram">${html(vendegMonogram(profile.customer_name))}</span>
                    <span class="admin-vendeg-sor-copy">
                        <strong>${html(profile.customer_name || 'Névtelen vendég')}</strong>
                        <small>${html(profile.customer_email || profile.customer_phone || 'Nincs elérhetőség')}</small>
                        <small>${kovetkezo}</small>
                    </span>
                    <span class="admin-vendeg-darab">${Number(profile.booking_count) || 0}<small>foglalás</small></span>
                </button>
            `;
        }).join('');
    }

    async function vendegProfilReszletBetoltese(customerKey) {
        const panel = document.getElementById('admin-panel-vendegek');
        const reszlet = panel?.querySelector('[data-vendeg-reszlet]');
        const profile = allapot.vendegProfilok.find(item => item.customer_key === customerKey);
        if (!reszlet || !profile || !allapot.kliens) return;

        const keresId = ++allapot.vendegProfilKeresId;
        reszlet.innerHTML = '<p class="admin-vendeg-ures">Előzmények betöltése…</p>';

        const { data, error } = await allapot.kliens
            .from('admin_customer_bookings')
            .select('*')
            .eq('customer_key', customerKey)
            .order('starts_at', { ascending: false })
            .limit(50);

        if (keresId !== allapot.vendegProfilKeresId || allapot.aktivVendegProfil !== customerKey) return;
        if (error) {
            reszlet.innerHTML = '<p class="admin-vendeg-ures admin-vendeg-hiba">Nem sikerült betölteni az előzményeket.</p>';
            return;
        }

        const bookings = Array.isArray(data) ? data : [];
        reszlet.innerHTML = `
            <header class="admin-vendeg-reszlet-fej">
                <span class="admin-vendeg-monogram admin-vendeg-monogram-large">${html(vendegMonogram(profile.customer_name))}</span>
                <div>
                    <p class="admin-v2-kicker">Vendégprofil</p>
                    <h2>${html(profile.customer_name || 'Névtelen vendég')}</h2>
                    <p>${Number(profile.booking_count) || 0} foglalás · ${Number(profile.completed_count) || 0} teljesítve</p>
                </div>
            </header>
            <div class="admin-vendeg-kapcsolatok">
                ${vendegKapcsolatLink('Email', profile.customer_email, 'mailto:')}
                ${vendegKapcsolatLink('Telefon', profile.customer_phone, 'tel:')}
            </div>
            <button type="button" class="admin-v2-button admin-v2-button-secondary admin-vendeg-foglalasok-gomb"
                data-admin-vendeg-foglalasok="${attr(profile.customer_email || profile.customer_phone || profile.customer_name)}">
                Foglalások megnyitása
            </button>
            <section class="admin-vendeg-elozmenyek">
                <div class="admin-vendeg-elozmenyek-fej">
                    <h3>Foglalási előzmények</h3><span>${bookings.length} tétel</span>
                </div>
                ${bookings.length ? bookings.map(vendegFoglalasSor).join('') : '<p class="admin-vendeg-ures">Nincs foglalási előzmény.</p>'}
            </section>
        `;
    }

    function vendegKapcsolatLink(label, value, protocol) {
        if (!value) return `<div><span>${label}</span><small>Nincs megadva</small></div>`;
        return `<a href="${protocol}${attr(value)}"><span>${label}</span><strong>${html(value)}</strong></a>`;
    }

    function vendegFoglalasSor(booking) {
        const status = booking.status || '';
        return `
            <article class="admin-vendeg-foglalas">
                <time datetime="${attr(booking.starts_at)}">${html(vendegDatumIdo(booking.starts_at))}</time>
                <div><strong>${html(booking.service_name || 'Foglalás')}</strong><small>${html(booking.price_text || booking.public_reference || '')}</small></div>
                <span class="admin-v2-status-chip is-${attr(adminV2StatuszTone(status))}">${html(adminV2StatuszFelirat(status))}</span>
            </article>
        `;
    }

    function vendegKeresesNormalizalasa(value) {
        return String(value || '').trim().toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function vendegMonogram(value) {
        const parts = String(value || '?').trim().split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase('hu-HU') || '?';
    }

    function vendegDatumIdo(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Ismeretlen időpont';
        return new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(date);
    }
