    const ADMIN_V2_TAB_GROUPS = Object.freeze({
        attekintes: 'attekintes',
        foglalasok: 'foglalasok',
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
            description: 'Keresés, státuszkezelés, naptár és a vendéghez tartozó adatok egy munkafelületen.',
            save: 'Módosítások mentése'
        },
        idosavok: {
            kicker: 'Elérhetőség',
            title: 'Munkaidő',
            description: 'Foglalható napok és időablakok kezelése.',
            save: 'Munkaidő mentése'
        },
        tiltasok: {
            kicker: 'Elérhetőség',
            title: 'Kieső időszakok',
            description: 'Külső foglalások, szabadságok és más nem foglalható idők.',
            save: 'Kieső idő mentése'
        },
        szovegek: {
            kicker: 'Tartalomkezelés',
            title: 'Weboldal',
            description: 'Oldalak, galéria és általános weboldalszövegek.',
            save: 'Tartalom mentése'
        },
        szolgaltatasok: {
            kicker: 'Weboldal és foglalás',
            title: 'Szolgáltatások és árlista',
            description: 'A publikus árlista és a foglalható szolgáltatások közös forrása.',
            save: 'Árlista mentése'
        },
        kuponok: {
            kicker: 'Weboldal és foglalás',
            title: 'Ajánlatok és kuponok',
            description: 'Aktív kedvezmények, érvényesség és megjelenés.',
            save: 'Kuponok mentése'
        },
        esemenynaplo: {
            kicker: 'Emailek és értesítések',
            title: 'Kommunikáció',
            description: 'Küldési események, hibák és a foglalási rendszer fontos változásai.'
        },
        emailteszt: {
            kicker: 'Emailek és értesítések',
            title: 'Email ellenőrzés',
            description: 'A teljes automatikus emailkészlet biztonságos tesztküldése.'
        },
        beallitasok: {
            kicker: 'Rendszer és fiók',
            title: 'Beállítások',
            description: 'Ritkábban változó szalon-, megjelenési és fiókbeállítások.',
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
        adminV2BeallitasokPanelLetrehozasa(workspaceMain);
        adminV2SidebarLetrehozasa(sidebar);
        adminV2TopbarLetrehozasa(tartalom);
        adminV2PanelFejlecekLetrehozasa();
        adminV2AlmenuLetrehozasa();
        adminV2EsemenyekKapcsolasa(tartalom);
        adminV2AdatFigyelokKapcsolasa();

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
            <img src="/kepek/luminails-logo.svg" alt="Luminails">
            <span>Admin</span>
        `;

        const nav = document.createElement('nav');
        nav.className = 'admin-v2-nav';
        nav.setAttribute('aria-label', 'Admin fő navigáció');
        nav.innerHTML = `
            <p class="admin-v2-nav-label">Munkaterület</p>
            ${adminV2NavGomb('attekintes', 'Áttekintés', adminV2Ikon('overview'))}
            ${adminV2NavGomb('foglalasok', 'Időpontok', adminV2Ikon('calendar'), '<span class="admin-v2-nav-count" data-admin-v2-pending-count>0</span>')}
            ${adminV2NavGomb('munkaido', 'Munkaidő', adminV2Ikon('clock'))}
            ${adminV2NavGomb('weboldal', 'Weboldal', adminV2Ikon('website'))}
            ${adminV2NavGomb('kommunikacio', 'Kommunikáció', adminV2Ikon('mail'), '<span class="admin-v2-nav-alert" data-admin-v2-email-alert hidden><span class="sr-only">Emailhiba</span></span>')}
        `;

        const secondary = document.createElement('div');
        secondary.className = 'admin-v2-sidebar-bottom';
        secondary.innerHTML = `
            ${adminV2NavGomb('beallitasok', 'Beállítások', adminV2Ikon('settings'))}
            <button type="button" class="admin-v2-profile" data-admin-v2-nav="beallitasok" aria-label="Fiók és beállítások megnyitása">
                <span class="admin-v2-avatar">LL</span>
                <span><strong>Levi</strong><small>Tulajdonos</small></span>
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
                <img src="/kepek/luminails-logo.svg" alt="Luminails">
            </div>
            <div class="admin-v2-topbar-copy">
                <p class="admin-v2-topbar-section" data-admin-v2-current-label>Áttekintés</p>
                <p>${adminV2MaiDatumFelirat()}</p>
            </div>
            <div class="admin-v2-topbar-actions">
                <button type="button" class="admin-v2-button admin-v2-button-secondary" data-admin-v2-panel="tiltasok">
                    ${adminV2Ikon('plus')} Kieső idő
                </button>
                <button type="button" class="admin-v2-icon-button" data-admin-v2-nav="kommunikacio" aria-label="Kommunikáció megnyitása">
                    ${adminV2Ikon('bell')}<span class="admin-v2-notification-dot" data-admin-v2-email-alert hidden></span>
                </button>
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
                    <h1>Jó reggelt, Levi</h1>
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
                    <p>${copy.description}</p>
                </div>
                ${copy.save ? `<div class="admin-v2-page-actions"><button type="button" class="admin-v2-button admin-v2-button-primary" data-admin-v2-save>${copy.save}</button></div>` : ''}
            `;
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
                ${adminV2MiniStat('Hibás', 'admin-v2-email-failed')}
                ${adminV2MiniStat('Legutóbbi hiba', 'admin-v2-email-last-error')}
            `;
            subnav.after(summary);
        }
    }

    function adminV2MiniStat(label, id) {
        return `<div><span>${label}</span><strong id="${id}">—</strong></div>`;
    }

    function adminV2EsemenyekKapcsolasa(tartalom) {
        tartalom.addEventListener('click', event => {
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

            if (event.target.closest('[data-admin-v2-save]')) {
                adminElemek().lebegoMentes?.click();
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
            }
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

    function adminV2CsoportMegnyitasa(group) {
        const defaultTabs = {
            attekintes: 'attekintes',
            foglalasok: 'foglalasok',
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
            munkaido: 'Munkaidő',
            weboldal: 'Weboldal',
            kommunikacio: 'Kommunikáció',
            beallitasok: 'Beállítások'
        };
        if (label) label.textContent = groupLabels[group] || 'Admin';

        adminV2MenuBezarasa();
        if (tab === 'attekintes') adminV2AttekintesFrissitese();
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
        const today = activeBookings
            .filter(item => adminV2DatumKulcs(new Date(item.starts_at)) === todayKey)
            .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
        const upcoming = activeBookings
            .filter(item => new Date(item.starts_at) > now)
            .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
            .slice(0, 5);
        const pending = activeBookings.filter(item => item.status === 'pending');
        const emailErrors = adminV2EmailHibasEsemenyek();
        const cancellations = adminV2OlvasatlanLemondasok();

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
        document.querySelectorAll('[data-admin-v2-email-alert]').forEach(element => {
            element.hidden = emailErrors.length === 0;
        });

        const summary = panel.querySelector('[data-admin-v2-today-summary]');
        if (summary) summary.textContent = today.length ? `${today.length} időpont · ${adminV2NapiIdosav(today)}` : 'Ma nincs aktív foglalás';
        adminV2NapiListaRenderelese(today);
        adminV2KovetkezoListaRenderelese(upcoming);
        adminV2TeendoListaRenderelese(pending, emailErrors, cancellations);
        await adminV2HorizonFrissitese(todayKey);
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
                <span class="admin-v2-schedule-copy"><strong>${html(item.customer_name)}</strong><small>${html(item.services?.name || 'Törölt szolgáltatás')}</small></span>
                <button type="button" class="admin-v2-status-chip admin-v2-tone-${adminV2StatuszTone(item.status)}" data-admin-v2-booking-search="${attr(item.customer_name)}">${html(adminV2StatuszFelirat(item.status))}</button>
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
                <button type="button" data-admin-v2-booking-search="${attr(item.customer_name)}">
                    <span><strong>${html(item.customer_name)}</strong><small>${html(item.services?.name || 'Törölt szolgáltatás')}</small></span>
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
        const failed = emailEvents.filter(adminV2EsemenyHibas);
        const success = emailEvents.filter(event => ['success', 'sent', 'ok'].includes(String(event.status || '').toLowerCase()));

        adminV2Text('admin-v2-email-today', String(todayEvents.length));
        adminV2Text('admin-v2-email-success', String(success.length));
        adminV2Text('admin-v2-email-failed', String(failed.length));
        adminV2Text('admin-v2-email-last-error', failed.length ? adminV2RovidDatumIdo(failed[0].created_at) : 'Nincs');
    }

    function adminV2EmailHibasEsemenyek() {
        return (Array.isArray(allapot.esemenynaploElemek) ? allapot.esemenynaploElemek : [])
            .filter(event => String(event.channel || '').toLowerCase() === 'email')
            .filter(adminV2EsemenyHibas);
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
            clock: '<circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path>',
            website: '<path d="M4 5h16v14H4zM4 9h16M8 5v4"></path>',
            mail: '<path d="M4 6h16v12H4zM4 7l8 6 8-6"></path>',
            settings: '<circle cx="12" cy="12" r="3"></circle><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"></path>',
            arrow: '<path d="m9 6 6 6-6 6"></path>',
            menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
            bell: '<path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4zM10 20h4"></path>',
            plus: '<path d="M12 5v14M5 12h14"></path>',
            check: '<path d="m5 12 4 4L19 6"></path>',
            alert: '<path d="M12 4 3 20h18zM12 9v5M12 17h.01"></path>',
            edit: '<path d="m5 16-1 4 4-1L18 9l-3-3zM13 8l3 3"></path>'
        };
        return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.arrow}</svg>`;
    }
