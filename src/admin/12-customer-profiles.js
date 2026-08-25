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