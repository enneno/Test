const { test, expect } = require('playwright/test');

function isoAt(dayOffset, hour, minute = 0) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}

function dateKey(dayOffset) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fixtures() {
    return {
        bookings: [
            {
                id: '00000000-0000-4000-8000-000000000001',
                public_reference: 'LUMI-DEMO1',
                customer_name: 'Nagy Anna',
                customer_phone: '+36 30 111 2233',
                customer_email: 'anna.nagy@example.test',
                note: 'Francia kormot szeretne.',
                starts_at: isoAt(0, 10),
                ends_at: isoAt(0, 12),
                status: 'confirmed',
                created_at: isoAt(-4, 12),
                coupon_code: '',
                coupon_title: '',
                nail_style: 'Francia',
                nail_style_note: '',
                inspiration_images: [],
                services: { name: 'Erositett gel lakk', price_text: '6 500 Ft' }
            },
            {
                id: '00000000-0000-4000-8000-000000000002',
                public_reference: 'LUMI-DEMO2',
                customer_name: 'Kiss Dorka',
                customer_phone: '+36 20 222 3344',
                customer_email: 'dorka.kiss@example.test',
                note: '',
                starts_at: isoAt(0, 14),
                ends_at: isoAt(0, 16),
                status: 'pending',
                created_at: isoAt(-1, 16),
                coupon_code: 'UJ10',
                coupon_title: 'Uj vendeg kedvezmeny',
                nail_style: 'Mandula',
                nail_style_note: '',
                inspiration_images: [],
                services: { name: 'Mukorom toltes - M', price_text: '8 000 Ft' }
            },
            {
                id: '00000000-0000-4000-8000-000000000003',
                public_reference: 'LUMI-DEMO3',
                customer_name: 'Toth Luca',
                customer_phone: '+36 70 333 4455',
                customer_email: 'luca.toth@example.test',
                note: '',
                starts_at: isoAt(1, 9),
                ends_at: isoAt(1, 11),
                status: 'confirmed',
                created_at: isoAt(-2, 11),
                coupon_code: '',
                coupon_title: '',
                nail_style: 'Kocka',
                nail_style_note: '',
                inspiration_images: [],
                services: { name: 'Gel lakk', price_text: '5 500 Ft' }
            },
            {
                id: '00000000-0000-4000-8000-000000000004',
                public_reference: 'LUMI-DEMO4',
                customer_name: 'Farkas Petra',
                customer_phone: '+36 30 444 5566',
                customer_email: 'petra.farkas@example.test',
                note: 'Korabbi vendeglemondas.',
                starts_at: isoAt(2, 13),
                ends_at: isoAt(2, 15),
                status: 'cancelled_by_customer',
                created_at: isoAt(-3, 13),
                coupon_code: '',
                coupon_title: '',
                nail_style: '',
                nail_style_note: '',
                inspiration_images: [],
                services: { name: 'Epites - S', price_text: '9 000 Ft' }
            }
        ],
        admin_registered_customer_profiles: [
            { user_id: 'customer-anna', customer_name: 'Nagy Anna', customer_email: 'anna.nagy@example.test', customer_phone: '+36 30 111 2233' },
            { user_id: 'customer-dorka', customer_name: 'Kiss Dorka', customer_email: 'dorka.kiss@example.test', customer_phone: '+36 20 222 3344' },
            { user_id: 'customer-luca', customer_name: 'Toth Luca', customer_email: 'luca.toth@example.test', customer_phone: '+36 70 333 4455' },
            { user_id: 'customer-petra', customer_name: 'Farkas Petra', customer_email: 'petra.farkas@example.test', customer_phone: '+36 30 444 5566' }
        ],
        blocked_times: [
            {
                id: '00000000-0000-4000-8000-000000000100',
                starts_at: isoAt(0, 8),
                ends_at: isoAt(0, 9),
                reason: 'Adminisztracio',
                status: 'active',
                created_at: isoAt(-1, 9)
            },
            {
                id: '00000000-0000-4000-8000-000000000101',
                starts_at: isoAt(3, 12),
                ends_at: isoAt(3, 14),
                reason: 'Szemelyes program',
                status: 'active',
                created_at: isoAt(-1, 10)
            }
        ],
        booking_events: [
            {
                id: 'event-1',
                booking_id: '00000000-0000-4000-8000-000000000001',
                event_type: 'confirmation_email',
                channel: 'email',
                status: 'success',
                title: 'Foglalas visszaigazolva',
                message: 'A visszaigazolo email sikeresen elkuldve.',
                metadata: {},
                created_at: isoAt(0, 10)
            },
            {
                id: 'event-2',
                booking_id: '00000000-0000-4000-8000-000000000002',
                event_type: 'booking_email',
                channel: 'email',
                status: 'failed',
                title: 'Email kuldesi hiba',
                message: 'A level kuldese sikertelen, ujraprobalas szukseges.',
                metadata: {},
                created_at: isoAt(0, 11)
            },
            {
                id: 'event-3',
                booking_id: '00000000-0000-4000-8000-000000000004',
                event_type: 'customer_cancelled',
                channel: 'system',
                status: 'success',
                title: 'Vendeg lemondta',
                message: 'Csaladi program miatt.',
                metadata: { cancellation_note: 'Csaladi program miatt.' },
                created_at: isoAt(0, 12)
            }
        ],
        services: [
            {
                id: 'service-1',
                name: 'Erositett gel lakk',
                category: 'Gel lakk',
                price_text: '6 500 Ft',
                price_amount: 6500,
                price_unit: 'Ft',
                duration_minutes: 120,
                active: true,
                sort_order: 1
            },
            {
                id: 'service-2',
                name: 'Mukorom toltes - M',
                category: 'Toltes',
                price_text: '8 000 Ft',
                price_amount: 8000,
                price_unit: 'Ft',
                duration_minutes: 120,
                active: true,
                sort_order: 2
            }
        ],
        coupons: [
            {
                id: 'coupon-1',
                code: 'UJ10',
                title: 'Uj vendeg kedvezmeny',
                description: '10% kedvezmeny elso alkalommal.',
                discount_type: 'percent',
                discount_value: 10,
                active: true,
                starts_at: isoAt(-30, 0),
                ends_at: isoAt(30, 23),
                sort_order: 1
            }
        ],
        availability_windows: [
            {
                id: 'window-1',
                work_date: dateKey(7),
                starts_at: isoAt(7, 9),
                ends_at: isoAt(7, 17),
                active: true
            },
            {
                id: 'window-2',
                work_date: dateKey(30),
                starts_at: isoAt(30, 9),
                ends_at: isoAt(30, 17),
                active: true
            }
        ],
        site_settings: [
            { key: 'phone_visible', value: { visible: true } },
            { key: 'site_content', value: {} }
        ]
    };
}

async function installSupabaseBoundaryMock(page) {
    const data = fixtures();

    await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: ''
    }));

    await page.addInitScript((seed) => {
        const clone = (value) => JSON.parse(JSON.stringify(value));

        class Query {
            constructor(table) {
                this.table = table;
                this.filters = [];
                this.singleResult = false;
            }

            select() { return this; }
            order() { return this; }
            limit() { return this; }
            range() { return this; }
            abortSignal() { return this; }
            throwOnError() { return this; }
            insert() { return this; }
            update() { return this; }
            upsert() { return this; }
            delete() { return this; }

            eq(key, value) {
                this.filters.push(row => String(row?.[key]) === String(value));
                return this;
            }

            neq(key, value) {
                this.filters.push(row => String(row?.[key]) !== String(value));
                return this;
            }

            in(key, values) {
                this.filters.push(row => values.map(String).includes(String(row?.[key])));
                return this;
            }

            is(key, value) {
                this.filters.push(row => row?.[key] === value);
                return this;
            }

            gte(key, value) {
                this.filters.push(row => String(row?.[key] || '') >= String(value));
                return this;
            }

            lte(key, value) {
                this.filters.push(row => String(row?.[key] || '') <= String(value));
                return this;
            }

            gt(key, value) {
                this.filters.push(row => String(row?.[key] || '') > String(value));
                return this;
            }

            lt(key, value) {
                this.filters.push(row => String(row?.[key] || '') < String(value));
                return this;
            }

            or() { return this; }
            not() { return this; }
            contains() { return this; }

            single() {
                this.singleResult = true;
                return this;
            }

            maybeSingle() {
                this.singleResult = true;
                return this;
            }

            execute() {
                let rows = clone(seed[this.table] || []);
                for (const filter of this.filters) rows = rows.filter(filter);
                return {
                    data: this.singleResult ? (rows[0] || null) : rows,
                    error: null,
                    count: rows.length
                };
            }

            then(resolve, reject) {
                return Promise.resolve(this.execute()).then(resolve, reject);
            }
        }

        const session = {
            access_token: 'demo-access-token',
            user: { id: 'admin-demo', email: 'admin@example.test' }
        };

        const client = {
            auth: {
                getSession: async () => ({ data: { session }, error: null }),
                onAuthStateChange: () => ({
                    data: { subscription: { unsubscribe() {} } }
                }),
                signInWithPassword: async () => ({ data: { session }, error: null }),
                signOut: async () => ({ error: null }),
                updateUser: async () => ({ data: { user: session.user }, error: null })
            },
            from: table => new Query(table),
            rpc: async (name, args) => {
                if (name === 'is_lumi_admin') {
                    return { data: true, error: null };
                }
                if (name === 'admin_registered_customer_profiles') {
                    return { data: clone(seed.admin_registered_customer_profiles), error: null };
                }
                if (name === 'apply_admin_booking_changes') {
                    for (const change of args?.p_changes || []) {
                        const rows = change.type === 'blocked' ? seed.blocked_times : seed.bookings;
                        const row = rows.find(item => item.id === change.id);
                        if (!row) continue;
                        row.status = change.status;
                        row.starts_at = change.starts_at;
                        row.ends_at = change.ends_at;
                        if (change.type === 'blocked') row.reason = change.reason;
                    }
                    return { data: { email_jobs: [] }, error: null };
                }
                return { data: [], error: null };
            },
            functions: {
                invoke: async () => ({ data: { success: true }, error: null })
            },
            storage: {
                from: () => ({
                    list: async () => ({ data: [], error: null }),
                    upload: async () => ({ data: {}, error: null }),
                    remove: async () => ({ data: [], error: null }),
                    createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null })
                })
            }
        };

        window.supabase = { createClient: () => client };
    }, data);
}

async function openAdmin(page, viewport) {
    await page.setViewportSize(viewport);
    const browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error') browserErrors.push(message.text());
    });

    await installSupabaseBoundaryMock(page);
    const response = await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator('#admin-tartalom')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/admin-v2/);
    await expect(page.locator('#admin-v2-stat-today')).toHaveText('3');

    return browserErrors;
}

test.describe('production admin redesign', () => {
    test('desktop: the new information architecture is compact and usable', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 1440, height: 1000 });

        await expect(page.locator('.admin-v2-topbar')).toBeVisible();
        await expect(page.locator('.admin-v2-sidebar')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'J\u00f3 reggelt, Szofi' })).toBeVisible();
        await expect(page.locator('#admin-v2-stat-pending')).toHaveText('1');
        await expect(page.locator('#admin-v2-stat-email')).toHaveText('1');
        await expect(page.locator('[data-admin-v2-today-list]')).toContainText('Adminisztracio');
        await expect(page.locator('[data-admin-v2-upcoming-list]')).toContainText('Szemelyes program');

        const brandLink = page.getByRole('link', { name: 'Admin áttekintés' }).first();
        await expect(brandLink).toHaveAttribute('href', '/admin/');
        await expect(brandLink.locator('img')).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Vissza a főoldalra' })).toHaveAttribute('href', '/');
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-overview.png', fullPage: true });
        }

        const desktopMetrics = await page.evaluate(() => {
            const bodyStyle = getComputedStyle(document.body);
            const heading = document.querySelector('.admin-v2-page-heading h1');
            const sidebar = document.querySelector('.admin-v2-sidebar').getBoundingClientRect();
            return {
                bodyFont: Number.parseFloat(bodyStyle.fontSize),
                headingFont: Number.parseFloat(getComputedStyle(heading).fontSize),
                sidebarWidth: Math.round(sidebar.width),
                overflow: document.documentElement.scrollWidth - window.innerWidth
            };
        });

        expect(desktopMetrics.bodyFont).toBe(14);
        expect(desktopMetrics.headingFont).toBeLessThanOrEqual(32);
        expect(desktopMetrics.sidebarWidth).toBeGreaterThanOrEqual(220);
        expect(desktopMetrics.overflow).toBeLessThanOrEqual(1);

        await page.locator('[data-admin-v2-nav="foglalasok"]').click();
        await expect(page.locator('#admin-panel-foglalasok')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-panel-foglalasok .admin-v2-page-heading h1')).toHaveText('Id\u0151pontok');
        await expect(page.locator('#admin-foglalas-lista .admin-foglalas-kartya')).toHaveCount(6);

        const bookingHeadingSize = await page.locator('#admin-panel-foglalasok .admin-v2-page-heading h1').evaluate(
            element => Number.parseFloat(getComputedStyle(element).fontSize)
        );
        expect(bookingHeadingSize).toBeLessThanOrEqual(32);
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-bookings-desktop.png', fullPage: true });
        }

        await page.locator('[data-admin-v2-nav="vendegek"]').click();
        await expect(page.locator('#admin-panel-vendegek')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-panel-vendegek .admin-v2-page-heading h1')).toHaveText('Regisztrált tagok');
        await expect(page.locator('[data-vendeg-osszefoglalo]')).toHaveText('4 regisztrált tag');
        await expect(page.locator('[data-vendeg-lista] .admin-vendeg-sor')).toHaveCount(4);
        await expect(page.locator('[data-vendeg-lista] .admin-vendeg-sor').first()).toContainText('Nagy Anna');
        await expect(page.locator('[data-vendeg-lista] .admin-vendeg-sor').first()).toContainText('anna.nagy@example.test');
        await expect(page.locator('[data-vendeg-lista] .admin-vendeg-sor').first()).toContainText('+36 30 111 2233');
        await expect(page.locator('[data-vendeg-reszlet]')).toHaveCount(0);
        await expect(page.locator('.admin-v2-profile strong')).toHaveText('Szofi');
        await expect(page.locator('.admin-v2-avatar')).toHaveText('SZ');
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-customers-desktop.png', fullPage: true });
        }

        await page.locator('[data-admin-v2-nav="munkaido"]').click();
        await expect(page.locator('#admin-panel-idosavok')).toHaveClass(/aktiv/);
        await page.locator('#admin-panel-idosavok [data-admin-v2-panel="tiltasok"]').click();
        await expect(page.locator('#admin-panel-tiltasok')).toHaveClass(/aktiv/);

        await page.locator('[data-admin-v2-nav="weboldal"]').click();
        await expect(page.locator('#admin-panel-szovegek')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-cms-root')).toBeVisible();

        await page.locator('.admin-v2-sidebar [data-admin-v2-nav="kommunikacio"]').click();
        await expect(page.locator('#admin-panel-esemenynaplo')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-v2-communication-summary')).toBeVisible();

        await page.locator('[data-admin-v2-nav="beallitasok"]').first().click();
        await expect(page.locator('#admin-panel-beallitasok')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-telefon-lathato')).toBeVisible();

        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-desktop.png', fullPage: true });
        }
        expect(browserErrors).toEqual([]);
    });

    test('mobile: the drawer, touch targets and booking page fit the viewport', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 390, height: 844 });

        const menuButton = page.getByRole('button', { name: 'Navig\u00e1ci\u00f3 megnyit\u00e1sa' });
        await expect(menuButton).toBeVisible();

        const targetSize = await menuButton.evaluate(element => {
            const rect = element.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        });
        expect(targetSize.width).toBeGreaterThanOrEqual(44);
        expect(targetSize.height).toBeGreaterThanOrEqual(44);

        const todayRowMetrics = await page.locator('[data-admin-v2-today-list] .admin-v2-status-chip').first().evaluate(chip => {
            const row = chip.closest('.admin-v2-schedule-item');
            const copy = row.querySelector('.admin-v2-schedule-copy');
            const chipRect = chip.getBoundingClientRect();
            const copyRect = copy.getBoundingClientRect();
            const rowRect = row.getBoundingClientRect();
            return {
                statusColumn: getComputedStyle(chip).gridColumnStart,
                statusRightOfCopy: chipRect.left >= copyRect.right,
                statusInsideRow: chipRect.top >= rowRect.top && chipRect.bottom <= rowRect.bottom,
                statusHeight: chipRect.height
            };
        });
        expect(todayRowMetrics.statusColumn).toBe('4');
        expect(todayRowMetrics.statusRightOfCopy).toBe(true);
        expect(todayRowMetrics.statusInsideRow).toBe(true);
        expect(todayRowMetrics.statusHeight).toBeLessThanOrEqual(36);
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-overview-mobile.png', fullPage: true });
        }

        await page.evaluate(() => {
            const body = document.body;
            const start = new Touch({
                identifier: 1,
                target: body,
                clientX: 64,
                clientY: 360
            });
            const end = new Touch({
                identifier: 1,
                target: body,
                clientX: 152,
                clientY: 364
            });
            body.dispatchEvent(new TouchEvent('touchstart', {
                bubbles: true,
                touches: [start],
                changedTouches: [start]
            }));
            body.dispatchEvent(new TouchEvent('touchend', {
                bubbles: true,
                touches: [],
                changedTouches: [end]
            }));
        });
        await expect(page.locator('body')).toHaveClass(/admin-v2-menu-open/);
        await expect.poll(async () => {
            return (await page.locator('.admin-v2-sidebar').boundingBox()).x;
        }).toBeGreaterThanOrEqual(-1);

        const drawerMetrics = await page.locator('.admin-v2-sidebar').evaluate(sidebar => {
            const bodyStyle = getComputedStyle(document.body);
            const sidebarRect = sidebar.getBoundingClientRect();
            const logoutRect = sidebar.querySelector('[data-admin-v2-logout]').getBoundingClientRect();
            const navItem = sidebar.querySelector('.admin-v2-nav-item');
            const navStyle = getComputedStyle(navItem);
            const label = navItem.querySelector('span:not(.admin-v2-nav-count):not(.admin-v2-nav-alert)');
            return {
                width: sidebarRect.width,
                height: sidebarRect.height,
                logoutBottom: logoutRect.bottom,
                viewportHeight: window.innerHeight,
                bodyPosition: bodyStyle.position,
                bodyOverflow: bodyStyle.overflow,
                navDisplay: navStyle.display,
                navJustify: navStyle.justifyContent,
                navTextAlign: navStyle.textAlign,
                labelTextAlign: getComputedStyle(label).textAlign
            };
        });
        expect(drawerMetrics.width).toBeLessThanOrEqual(244);
        expect(drawerMetrics.height).toBeLessThanOrEqual(drawerMetrics.viewportHeight + 1);
        expect(drawerMetrics.logoutBottom).toBeLessThanOrEqual(drawerMetrics.viewportHeight + 1);
        expect(drawerMetrics.bodyPosition).toBe('fixed');
        expect(drawerMetrics.bodyOverflow).toBe('hidden');
        expect(drawerMetrics.navDisplay).toBe('flex');
        expect(drawerMetrics.navJustify).toBe('flex-start');
        expect(drawerMetrics.navTextAlign).toBe('left');
        expect(drawerMetrics.labelTextAlign).toBe('left');

        await page.locator('.admin-v2-sidebar [data-admin-v2-nav="foglalasok"]').click();
        await expect(page.locator('body')).not.toHaveClass(/admin-v2-menu-open/);
        await expect(page.locator('#admin-panel-foglalasok')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-panel-foglalasok .admin-v2-page-heading h1')).toHaveText('Id\u0151pontok');

        const fixedHeader = await page.locator('.admin-v2-topbar').evaluate(element => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return { position: style.position, top: Math.round(rect.top) };
        });
        expect(fixedHeader).toEqual({ position: 'fixed', top: 0 });

        const firstCard = page.locator('#admin-foglalas-lista .admin-foglalas-kartya').first();
        await firstCard.getByRole('button', { name: 'Szerkesztés' }).click();
        const editorMetrics = await firstCard.evaluate(card => {
            const status = card.querySelector('[data-foglalas-statusz]').getBoundingClientRect();
            const date = card.querySelector('[data-idopont-mezo="date"]').getBoundingClientRect();
            const start = card.querySelector('[data-idopont-mezo="start_time"]').getBoundingClientRect();
            const end = card.querySelector('[data-idopont-mezo="end_time"]').getBoundingClientRect();
            return {
                statusHeight: status.height,
                dateWidth: date.width,
                startWidth: start.width,
                endWidth: end.width
            };
        });
        expect(editorMetrics.statusHeight).toBeLessThanOrEqual(36);
        expect(editorMetrics.dateWidth).toBeGreaterThan(editorMetrics.startWidth * 1.25);
        expect(editorMetrics.dateWidth).toBeGreaterThan(editorMetrics.endWidth * 1.25);

        const mobileMetrics = await page.evaluate(() => {
            const heading = document.querySelector('#admin-panel-foglalasok .admin-v2-page-heading h1');
            const firstCard = document.querySelector('#admin-foglalas-lista .admin-foglalas-kartya');
            const cardRect = firstCard?.getBoundingClientRect();
            const cardTitle = firstCard?.querySelector('.admin-foglalas-fosor h3');
            const controls = Array.from(firstCard?.querySelectorAll('.admin-foglalas-vezerlok > *') || []);
            const viewSwitch = document.querySelector('#admin-panel-foglalasok .admin-foglalas-nezetvalto');
            const viewButton = viewSwitch?.querySelector('.admin-foglalas-nezet-gomb');
            const saveButton = document.querySelector('#admin-panel-foglalasok [data-admin-v2-save]');
            const cancellationButtons = Array.from(document.querySelectorAll('#admin-panel-foglalasok .admin-vendeg-lemondas-akciok .admin-kis-gomb'));
            const cancellationButtonRects = cancellationButtons.map(element => element.getBoundingClientRect());
            return {
                headingFont: Number.parseFloat(getComputedStyle(heading).fontSize),
                cardTitleFont: Number.parseFloat(getComputedStyle(cardTitle).fontSize),
                controlHeights: controls.map(element => element.getBoundingClientRect().height),
                viewSwitchWidth: viewSwitch?.getBoundingClientRect().width || 0,
                viewButtonHeight: viewButton?.getBoundingClientRect().height || 0,
                saveButtonHeight: saveButton?.getBoundingClientRect().height || 0,
                cancellationButtonHeights: cancellationButtonRects.map(rect => rect.height),
                cancellationButtonsSameRow: cancellationButtonRects.length < 2
                    || Math.abs(cancellationButtonRects[0].top - cancellationButtonRects[1].top) <= 1,
                overflow: document.documentElement.scrollWidth - window.innerWidth,
                cardLeft: cardRect?.left || 0,
                cardRight: cardRect?.right || 0,
                viewport: window.innerWidth
            };
        });

        expect(mobileMetrics.headingFont).toBeLessThanOrEqual(24);
        expect(mobileMetrics.cardTitleFont).toBe(14);
        expect(Math.max(...mobileMetrics.controlHeights)).toBeLessThanOrEqual(36);
        expect(mobileMetrics.viewSwitchWidth).toBeLessThanOrEqual(180);
        expect(mobileMetrics.viewButtonHeight).toBeLessThanOrEqual(36);
        expect(mobileMetrics.saveButtonHeight).toBeLessThanOrEqual(38);
        expect(Math.max(...mobileMetrics.cancellationButtonHeights)).toBeLessThanOrEqual(36);
        expect(mobileMetrics.cancellationButtonsSameRow).toBe(true);
        expect(mobileMetrics.overflow).toBeLessThanOrEqual(1);
        expect(mobileMetrics.cardLeft).toBeGreaterThanOrEqual(0);
        expect(mobileMetrics.cardRight).toBeLessThanOrEqual(mobileMetrics.viewport + 1);

        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-mobile.png', fullPage: true });
        }

        for (const viewport of [{ width: 320, height: 700 }, { width: 844, height: 390 }]) {
            await page.setViewportSize(viewport);
            const responsiveOverflow = await page.evaluate(
                () => document.documentElement.scrollWidth - window.innerWidth
            );
            expect(responsiveOverflow).toBeLessThanOrEqual(1);
        }

        expect(browserErrors).toEqual([]);
    });

    test('booking actions and filters stay usable at the requested responsive widths', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 1440, height: 1000 });

        await page.locator('[data-admin-v2-nav="foglalasok"]').click();
        const panel = page.locator('#admin-panel-foglalasok');
        const pageActions = panel.locator('.admin-v2-page-actions');
        const saveButton = pageActions.getByRole('button', { name: 'Módosítások mentése' });
        const exportButton = pageActions.getByRole('button', { name: 'Excel export' });
        const refreshButton = panel.getByRole('button', { name: 'Foglalások frissítése' });
        const searchInput = panel.locator('#admin-foglalas-kereses');

        await expect(saveButton).toBeVisible();
        await expect(exportButton).toBeVisible();
        await expect(refreshButton).toHaveAttribute('title', 'Foglalások frissítése');
        await expect(searchInput).toHaveAttribute('placeholder', 'Név, e-mail vagy telefon');
        expect((await refreshButton.textContent()).trim()).toBe('');
        expect(await refreshButton.evaluate(button => button.parentElement?.classList.contains('admin-v2-page-actions'))).toBe(true);

        const manualCard = panel.locator('.admin-foglalas-kartya').filter({ hasText: 'Adminisztracio' });
        const onlineCard = panel.locator('.admin-foglalas-kartya').filter({ hasText: 'Nagy Anna' });
        const manualService = manualCard.locator('.admin-foglalas-rovid-szolgaltatas');
        const onlineService = onlineCard.locator('.admin-foglalas-rovid-szolgaltatas');

        await expect(manualCard.locator('.admin-kartya-tipus')).toHaveText('Kézzel felvett idő');
        await expect(manualService).toBeEmpty();
        expect(await manualCard.locator('.admin-kartya-tipus').evaluate(
            element => getComputedStyle(element).textTransform
        )).toBe('uppercase');

        const serviceRowHeights = await Promise.all([
            manualService.evaluate(element => element.getBoundingClientRect().height),
            onlineService.evaluate(element => element.getBoundingClientRect().height)
        ]);
        expect(Math.abs(serviceRowHeights[0] - serviceRowHeights[1])).toBeLessThanOrEqual(1);

        for (const viewport of [
            { width: 390, height: 844 },
            { width: 430, height: 932 },
            { width: 768, height: 1024 },
            { width: 1440, height: 1000 }
        ]) {
            await page.setViewportSize(viewport);

            const metrics = await panel.evaluate((root, mobileMaxWidth) => {
                const rect = element => element.getBoundingClientRect();
                const insideViewport = element => {
                    const bounds = rect(element);
                    return bounds.left >= -1 && bounds.right <= window.innerWidth + 1;
                };
                const search = root.querySelector('#admin-foglalas-kereses');
                const status = root.querySelector('#admin-foglalas-statusz-szuro');
                const pager = root.querySelector('#admin-foglalas-lapozo-felso');
                const refresh = root.querySelector('#admin-foglalas-frissites');
                const pageSize = pager.querySelector('[data-foglalas-oldalmeret]');
                const actions = root.querySelector('.admin-v2-page-actions');
                const actionButtons = Array.from(actions.querySelectorAll('button'));
                const refreshBounds = rect(refresh);
                const pageSizeBounds = rect(pageSize);

                return {
                    overflow: document.documentElement.scrollWidth - window.innerWidth,
                    searchInside: insideViewport(search),
                    statusInside: insideViewport(status),
                    pagerInside: insideViewport(pager),
                    pagerOverflow: pager.scrollWidth - pager.clientWidth,
                    actionsInside: actionButtons.every(insideViewport),
                    searchFont: Number.parseFloat(getComputedStyle(search).fontSize),
                    mobileFontLargeEnough: window.innerWidth > mobileMaxWidth
                        || Number.parseFloat(getComputedStyle(search).fontSize) >= 16,
                    refreshWidth: refreshBounds.width,
                    refreshHeight: refreshBounds.height,
                    refreshInPageActions: refresh.parentElement === actions,
                    sharedActionBlock: actionButtons.length === 3
                        && actionButtons.every(button => button.parentElement === actions)
                };
            }, 430);

            expect(metrics.overflow, `${viewport.width}px document overflow`).toBeLessThanOrEqual(1);
            expect(metrics.searchInside, `${viewport.width}px search`).toBe(true);
            expect(metrics.statusInside, `${viewport.width}px status filter`).toBe(true);
            expect(metrics.pagerInside, `${viewport.width}px pager`).toBe(true);
            expect(metrics.pagerOverflow, `${viewport.width}px pager overflow`).toBeLessThanOrEqual(1);
            expect(metrics.actionsInside, `${viewport.width}px page actions`).toBe(true);
            expect(metrics.mobileFontLargeEnough, `${viewport.width}px search font ${metrics.searchFont}px`).toBe(true);
            expect(metrics.refreshWidth, `${viewport.width}px refresh width`).toBeGreaterThanOrEqual(34);
            expect(metrics.refreshHeight, `${viewport.width}px refresh height`).toBeGreaterThanOrEqual(34);
            expect(metrics.refreshInPageActions, `${viewport.width}px refresh placement`).toBe(true);
            expect(metrics.sharedActionBlock, `${viewport.width}px shared page actions`).toBe(true);
        }

        await refreshButton.click();
        await expect(panel.locator('#admin-foglalas-lista .admin-foglalas-kartya')).toHaveCount(6);
        expect(browserErrors).toEqual([]);
    });

    test('mobile: the registered member list stays within the viewport', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 390, height: 844 });

        await page.getByRole('button', { name: 'Navigáció megnyitása' }).click();
        await page.locator('.admin-v2-sidebar [data-admin-v2-nav="vendegek"]').click();
        await expect(page.locator('#admin-panel-vendegek')).toHaveClass(/aktiv/);
        await expect(page.locator('[data-vendeg-osszefoglalo]')).toHaveText('4 regisztrált tag');
        await expect(page.locator('[data-vendeg-lista] .admin-vendeg-sor')).toHaveCount(4);
        await expect(page.locator('[data-vendeg-lista] .admin-vendeg-sor').first()).toContainText('Nagy Anna');

        const metrics = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            listRight: document.querySelector('[data-vendeg-lista]').getBoundingClientRect().right,
            viewport: window.innerWidth
        }));
        expect(metrics.overflow).toBeLessThanOrEqual(1);
        expect(metrics.listRight).toBeLessThanOrEqual(metrics.viewport + 1);

        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-customers-mobile.png', fullPage: true });
        }

        expect(browserErrors).toEqual([]);
    });

    test('mobile: content and price editors use progressive disclosure without overflow', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 390, height: 844 });

        await page.getByRole('button', { name: 'Navigáció megnyitása' }).click();
        await page.locator('.admin-v2-sidebar [data-admin-v2-nav="weboldal"]').click();
        await expect(page.locator('#admin-panel-szovegek')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-cms-root')).toBeVisible();
        await expect(page.getByText('Tartalomszerkesztő', { exact: true })).toHaveCount(0);
        await expect(page.locator('.admin-v2-page-description')).toHaveCount(0);

        const sectionPicker = page.locator('.cms-section-picker');
        const sectionIndex = page.locator('.cms-section-index');
        await expect(sectionPicker).toBeVisible();
        await expect(sectionIndex).toBeHidden();

        const sectionSelect = sectionPicker.locator('select');
        const choices = await sectionSelect.locator('option').evaluateAll(options => options.map(option => ({
            label: option.textContent.trim(),
            value: option.value
        })));
        expect(choices.length).toBeGreaterThan(1);
        await sectionSelect.selectOption(choices[1].value);
        await expect(page.locator('.cms-editor-card-header h3')).toContainText(choices[1].label);
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-content-mobile.png', fullPage: true });
        }

        await page.locator('#admin-panel-szovegek [data-admin-v2-panel="szolgaltatasok"]').click();
        const pricePanel = page.locator('#admin-panel-szolgaltatasok');
        await expect(pricePanel).toHaveClass(/aktiv/);
        await expect(pricePanel.locator('.admin-db-kartya')).toHaveCount(2);

        const firstCard = pricePanel.locator('.admin-db-kartya').first();
        await firstCard.locator('[data-admin-kartya-toggle]').click();
        await expect(firstCard.locator('.admin-szerkeszto-szakasz')).toHaveCount(2);
        await expect(firstCard.locator('.admin-szerkeszto-szakasz legend')).toHaveText(['Alapadatok', 'Ár és időtartam']);
        await expect(firstCard.locator('[data-mezo="sort_order"]')).toHaveAttribute('type', 'hidden');

        const editorMetrics = await pricePanel.evaluate(panel => ({
            panelOverflow: panel.scrollWidth - panel.clientWidth,
            documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
            toggleHeight: panel.querySelector('[data-admin-kartya-toggle]').getBoundingClientRect().height
        }));
        expect(editorMetrics.panelOverflow).toBeLessThanOrEqual(1);
        expect(editorMetrics.documentOverflow).toBeLessThanOrEqual(1);
        expect(editorMetrics.toggleHeight).toBeGreaterThanOrEqual(44);
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-prices-mobile.png', fullPage: true });
        }
        expect(browserErrors).toEqual([]);
    });

    test('the bell opens a notification list and routes each live item to its workflow', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 390, height: 844 });
        const bell = page.getByRole('button', { name: 'Értesítések megnyitása' });


        await bell.click();
        const panel = page.getByRole('region', { name: 'Értesítések' });
        await expect(panel).toBeVisible();
        await expect(panel).toContainText('1 megerősítésre vár');
        await expect(panel).toContainText('1 új vendéglemondás');
        await expect(panel).toContainText('1 emailhiba');
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-notifications-mobile.png', fullPage: true });
        }

        await panel.getByRole('button', { name: /megerősítésre vár/i }).click();
        await expect(page.locator('#admin-panel-foglalasok')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-foglalas-statusz-szuro')).toHaveValue('pending');
        await expect(panel).toBeHidden();

        const pendingCard = page.locator('#admin-foglalas-lista .admin-foglalas-kartya').filter({ hasText: 'Kiss Dorka' });
        await pendingCard.getByRole('button', { name: 'Szerkesztés' }).click();
        await pendingCard.locator('[data-foglalas-statusz]').selectOption('confirmed');
        await page.locator('#admin-panel-foglalasok [data-admin-v2-save]').click();
        await expect(page.locator('#admin-foglalas-lista .admin-foglalas-kartya')).toHaveCount(0);

        await bell.click();
        await expect(panel).not.toContainText('megerősítésre vár');
        await panel.getByRole('button', { name: /új vendéglemondás/i }).click();
        await expect(page.locator('#admin-foglalas-statusz-szuro')).toHaveValue('cancelled_by_customer');
        await page.getByRole('button', { name: 'Új lemondások nyugtázása' }).click();
        await bell.click();
        await expect(panel).not.toContainText('új vendéglemondás');

        await panel.getByRole('button', { name: /emailhiba/i }).click();
        await expect(page.locator('#admin-panel-esemenynaplo')).toHaveClass(/aktiv/);
        await expect(panel).toBeHidden();
        expect(browserErrors).toEqual([]);
    });

    test('the standalone app bell stays open and the desktop topbar leaves no mobile remnants', async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(window.navigator, 'standalone', {
                configurable: true,
                value: true
            });
        });

        const browserErrors = await openAdmin(page, { width: 390, height: 844 });
        await expect(page.locator('body')).toHaveClass(/lumi-admin-standalone/);
        await expect(page.locator('.admin-v2-topbar')).toBeHidden();
        await expect(page.locator('#pwa-admin-tabbar .pwa-admin-toolbar-button')).toHaveCount(6);

        const bell = page.locator('[data-pwa-admin-notifications]');
        await bell.click();

        const panel = page.getByRole('region', { name: 'Értesítések' });
        await expect(panel).toBeVisible();
        await expect(bell).toHaveAttribute('aria-expanded', 'true');
        await expect(panel).toContainText('1 megerősítésre vár');
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-pwa-notifications-mobile.png', fullPage: true });
        }

        await bell.click();
        await expect(panel).toBeHidden();
        await page.evaluate(() => {
            document.querySelector('.admin-v2-sidebar [data-admin-v2-nav="weboldal"]')?.click();
        });
        await expect(page.locator('#admin-panel-szovegek')).toHaveClass(/aktiv/);
        await expect(page.locator('.cms-section-picker')).toBeVisible();
        await expect(page.locator('.admin-v2-topbar')).toBeHidden();
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-pwa-content-mobile.png', fullPage: true });
        }
        expect(browserErrors).toEqual([]);
    });
});
