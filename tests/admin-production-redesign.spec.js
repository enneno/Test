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
        blocked_times: [
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
            rpc: async () => ({ data: [], error: null }),
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
    await expect(page.locator('#admin-v2-stat-today')).toHaveText('2');

    return browserErrors;
}

test.describe('production admin redesign', () => {
    test('desktop: the new information architecture is compact and usable', async ({ page }) => {
        const browserErrors = await openAdmin(page, { width: 1440, height: 1000 });

        await expect(page.locator('.admin-v2-topbar')).toBeVisible();
        await expect(page.locator('.admin-v2-sidebar')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'J\u00f3 reggelt, Levi' })).toBeVisible();
        await expect(page.locator('#admin-v2-stat-pending')).toHaveText('1');
        await expect(page.locator('#admin-v2-stat-email')).toHaveText('1');
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
        await expect(page.locator('#admin-foglalas-lista .admin-foglalas-kartya')).toHaveCount(5);

        const bookingHeadingSize = await page.locator('#admin-panel-foglalasok .admin-v2-page-heading h1').evaluate(
            element => Number.parseFloat(getComputedStyle(element).fontSize)
        );
        expect(bookingHeadingSize).toBeLessThanOrEqual(32);
        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-bookings-desktop.png', fullPage: true });
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

        await menuButton.click();
        await expect(page.locator('body')).toHaveClass(/admin-v2-menu-open/);
        await expect.poll(async () => {
            return (await page.locator('.admin-v2-sidebar').boundingBox()).x;
        }).toBeGreaterThanOrEqual(-1);

        await page.locator('.admin-v2-sidebar [data-admin-v2-nav="foglalasok"]').click();
        await expect(page.locator('body')).not.toHaveClass(/admin-v2-menu-open/);
        await expect(page.locator('#admin-panel-foglalasok')).toHaveClass(/aktiv/);
        await expect(page.locator('#admin-panel-foglalasok .admin-v2-page-heading h1')).toHaveText('Id\u0151pontok');

        const mobileMetrics = await page.evaluate(() => {
            const heading = document.querySelector('#admin-panel-foglalasok .admin-v2-page-heading h1');
            const firstCard = document.querySelector('#admin-foglalas-lista .admin-foglalas-kartya');
            const cardRect = firstCard?.getBoundingClientRect();
            return {
                headingFont: Number.parseFloat(getComputedStyle(heading).fontSize),
                overflow: document.documentElement.scrollWidth - window.innerWidth,
                cardLeft: cardRect?.left || 0,
                cardRight: cardRect?.right || 0,
                viewport: window.innerWidth
            };
        });

        expect(mobileMetrics.headingFont).toBeLessThanOrEqual(24);
        expect(mobileMetrics.overflow).toBeLessThanOrEqual(1);
        expect(mobileMetrics.cardLeft).toBeGreaterThanOrEqual(0);
        expect(mobileMetrics.cardRight).toBeLessThanOrEqual(mobileMetrics.viewport + 1);

        if (process.env.LUMI_CAPTURE_ADMIN_REDESIGN === '1') {
            await page.screenshot({ path: 'test-results/admin-redesign-mobile.png', fullPage: true });
        }
        expect(browserErrors).toEqual([]);
    });
});
