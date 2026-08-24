const { test, expect } = require('playwright/test');
const fs = require('node:fs');
const path = require('node:path');

async function installCustomerAccountMock(page, options = {}) {
    const user = options.user || null;
    const profile = options.profile || null;
    const bookings = options.bookings || [];
    const ready = options.ready !== false;

    await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
        status: 200,
        contentType: 'text/javascript; charset=utf-8',
        body: ''
    }));

    await page.addInitScript(({ userData, profileData, bookingData, accountReady }) => {
        const state = {
            user: userData,
            profile: profileData,
            bookings: bookingData,
            ready: accountReady,
            calls: []
        };
        window.__customerAccountMock = state;

        function queryResult(table) {
            if (table === 'customer_profiles') return state.profile ? [state.profile] : [];
            return [];
        }

        function query(table) {
            const result = { data: queryResult(table), error: null };
            const chain = {
                select: () => chain,
                eq: () => chain,
                order: () => chain,
                limit: () => chain,
                single: async () => ({ data: result.data[0] || null, error: null }),
                then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
            };
            return chain;
        }

        const client = {
            auth: {
                getUser: async () => ({ data: { user: state.user }, error: state.user ? null : { message: 'no session' } }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
                signInWithPassword: async credentials => {
                    state.calls.push({ method: 'signInWithPassword', credentials });
                    return { data: { user: state.user, session: state.user ? { access_token: 'mock' } : null }, error: state.user ? null : { message: 'invalid' } };
                },
                signUp: async payload => {
                    state.calls.push({ method: 'signUp', payload });
                    return { data: { user: { id: 'pending-user' }, session: null }, error: null };
                },
                resend: async payload => {
                    state.calls.push({ method: 'resend', payload });
                    return { data: {}, error: null };
                },
                resetPasswordForEmail: async (email, options) => {
                    state.calls.push({ method: 'resetPasswordForEmail', email, options });
                    return { data: {}, error: null };
                },
                updateUser: async payload => {
                    state.calls.push({ method: 'updateUser', payload });
                    return { data: { user: state.user }, error: null };
                },
                signOut: async options => {
                    state.calls.push({ method: 'signOut', options });
                    return { error: null };
                }
            },
            from: table => query(table),
            rpc: async (name, args) => {
                state.calls.push({ method: 'rpc', name, args });
                if (name === 'customer_accounts_ready') return { data: state.ready, error: null };
                if (name === 'ensure_customer_account') return { data: state.profile, error: null };
                if (name === 'save_customer_profile') return { data: state.profile, error: null };
                if (name === 'get_my_booking_history') return { data: state.bookings, error: null };
                return { data: [], error: null };
            },
            functions: { invoke: async () => ({ data: null, error: null }) }
        };

        window.supabase = { createClient: () => client };
    }, { userData: user, profileData: profile, bookingData: bookings, accountReady: ready });
}

test('a vendégfiók élesítés előtt nem indít hitelesítési műveletet', async ({ page }) => {
    await installCustomerAccountMock(page, { ready: false });
    await page.goto('/fiokom/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('tab', { name: 'Regisztráció' }).click();
    await expect(page.locator('#fiok-regisztracio-form [name="email"]')).toBeDisabled();
    await expect(page.locator('#fiok-regisztracio-form [type="submit"]')).toBeDisabled();
    await expect(page.locator('#fiok-globalis-statusz')).toContainText('biztonságos élesítése még folyamatban van');

    const authCalls = await page.evaluate(() => window.__customerAccountMock.calls.filter(call => ['signUp', 'signInWithPassword'].includes(call.method)));
    expect(authCalls).toHaveLength(0);
});

test('a vendég regisztráció csak e-mail-megerősítés után hoz létre használható fiókot', async ({ page }) => {
    await installCustomerAccountMock(page);
    await page.goto('/fiokom/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('tab', { name: 'Regisztráció' }).click();
    const form = page.locator('#fiok-regisztracio-form');
    await form.locator('[name="full_name"]').fill('Kiss Dóra');
    await form.locator('[name="phone"]').fill('201234567');
    await form.locator('[name="email"]').fill('Dora@example.com');
    await form.locator('[name="password"]').fill('Egy-hosszu-egyedi-jelszo1');
    await form.locator('[name="password_again"]').fill('Egy-hosszu-egyedi-jelszo1');
    await form.locator('[type="checkbox"]').check();
    await form.getByRole('button', { name: 'Fiók létrehozása' }).click();

    await expect(page.locator('#fiok-megerosites-panel')).toBeVisible();
    await expect(page.locator('#fiok-iranyitopult')).toBeHidden();
    await expect(page.locator('#fiok-megerosites-email')).toHaveText('dora@example.com');

    const signUp = await page.evaluate(() => window.__customerAccountMock.calls.find(call => call.method === 'signUp'));
    expect(signUp.payload.email).toBe('dora@example.com');
    expect(signUp.payload.options.emailRedirectTo).toBe(new URL('/fiokom/', page.url()).href);
    expect(signUp.payload.options.data).toEqual({ full_name: 'Kiss Dóra', phone: '+36 201234567' });
});

test('a hibás összetételű jelszó nem indít regisztrációt', async ({ page }) => {
    await installCustomerAccountMock(page);
    await page.goto('/fiokom/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('tab', { name: 'Regisztráció' }).click();
    const form = page.locator('#fiok-regisztracio-form');
    await form.locator('[name="full_name"]').fill('Kiss Dóra');
    await form.locator('[name="phone"]').fill('201234567');
    await form.locator('[name="email"]').fill('dora@example.com');
    await form.locator('[name="password"]').fill('CSAKNAGYBETU123');
    await form.locator('[name="password_again"]').fill('CSAKNAGYBETU123');
    await form.locator('[type="checkbox"]').check();
    await form.getByRole('button', { name: 'Fiók létrehozása' }).click();

    await expect(page.locator('#fiok-globalis-statusz')).toContainText('legalább egy kisbetű');
    const signUpCalls = await page.evaluate(() => window.__customerAccountMock.calls.filter(call => call.method === 'signUp'));
    expect(signUpCalls).toHaveLength(0);
});

test('az elfelejtett jelszó nem árulja el, hogy létezik-e a fiók', async ({ page }) => {
    await installCustomerAccountMock(page);
    await page.goto('/fiokom/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: 'Elfelejtetted a jelszavad?' }).click();
    const form = page.locator('#fiok-elfelejtett-form');
    await form.locator('[name="email"]').fill('dora@example.com');
    await form.getByRole('button', { name: 'Jelszó-visszaállító e-mail küldése' }).click();

    await expect(page.locator('#fiok-globalis-statusz')).toContainText('Ha ehhez az e-mail-címhez tartozik fiók');
    const reset = await page.evaluate(() => window.__customerAccountMock.calls.find(call => call.method === 'resetPasswordForEmail'));
    expect(reset.options.redirectTo).toBe(new URL('/fiokom/?recovery=1', page.url()).href);
});

test('a hitelesített vendég csak a szűkített saját profilját és előzményeit látja', async ({ page }) => {
    await installCustomerAccountMock(page, {
        user: {
            id: 'customer-1',
            email: 'dora@example.com',
            email_confirmed_at: '2026-08-24T10:00:00Z',
            is_anonymous: false,
            user_metadata: {}
        },
        profile: { user_id: 'customer-1', full_name: 'Kiss Dóra', phone: '+36 201234567' },
        bookings: [{
            booking_id: 'booking-1',
            public_reference: 'LUMI-ABC123',
            service_name: 'Erősített gél lakk',
            starts_at: '2026-09-02T08:00:00Z',
            ends_at: '2026-09-02T10:00:00Z',
            status: 'confirmed',
            nail_style: 'Francia',
            note: null,
            final_price_amount: 8500,
            service_price_unit: 'Ft',
            service_price_suffix: '',
            total_count: 1
        }]
    });
    await page.goto('/fiokom/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#fiok-iranyitopult')).toBeVisible();
    await expect(page.locator('#fiok-udvozles')).toHaveText('Üdv újra, Kiss Dóra!');
    await expect(page.locator('#fiok-profil-nev')).toHaveValue('Kiss Dóra');
    await expect(page.locator('#fiok-profil-telefon')).toHaveValue('201234567');
    const dashboardHeadings = await page.locator('.fiok-dashboard-racs > section h2').allTextContents();
    expect(dashboardHeadings).toEqual(['Foglalásaim', 'Személyes adatok']);
    await expect(page.locator('.fiok-foglalas-kartya')).toHaveCount(1);
    await expect(page.locator('.fiok-foglalas-kartya')).toContainText('Erősített gél lakk');
    await expect(page.locator('.fiok-foglalas-kartya')).toContainText('Visszaigazolva');
    await expect(page.getByRole('link', { name: 'Foglalás kezelése' })).toHaveAttribute('href', '/foglalas/?foglalas=LUMI-ABC123#foglalas-ellenorzes');

    const rpcNames = await page.evaluate(() => window.__customerAccountMock.calls.filter(call => call.method === 'rpc').map(call => call.name));
    expect(rpcNames).toEqual(expect.arrayContaining(['ensure_customer_account', 'get_my_booking_history']));
    expect(rpcNames).not.toContain('admin_customer_profiles');
});

test('a hitelesített profil előre kitölti a foglalást és az e-mail nem írható át', async ({ page }) => {
    await installCustomerAccountMock(page, {
        user: {
            id: 'customer-1',
            email: 'dora@example.com',
            email_confirmed_at: '2026-08-24T10:00:00Z',
            is_anonymous: false,
            user_metadata: {}
        },
        profile: { user_id: 'customer-1', full_name: 'Kiss Dóra', phone: '+36 201234567' }
    });
    await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#foglalas-nev')).toHaveValue('Kiss Dóra');
    await expect(page.locator('#foglalas-tel')).toHaveValue('201234567');
    await expect(page.locator('#foglalas-email')).toHaveValue('dora@example.com');
    await expect(page.locator('#foglalas-email')).toHaveAttribute('readonly', '');
    await expect(page.locator('.foglalas-fiok-jelzes')).toContainText('fiókodban elmentett adataidat');
});

test('a vendégfiók mobilon sem lóg ki a képernyőről', async ({ page }) => {
    await installCustomerAccountMock(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/fiokom/', { waitUntil: 'domcontentloaded' });

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const headerGap = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const hero = document.querySelector('.fiok-hero');
        return Math.round(hero.getBoundingClientRect().top - header.getBoundingClientRect().bottom);
    });
    expect(headerGap).toBeGreaterThanOrEqual(20);
    expect(headerGap).toBeLessThanOrEqual(28);
    await expect(page.locator('.fiok-auth-kartya')).toBeVisible();
    await expect(page.locator('.hamburger')).toBeVisible();
    await expect(page.locator('#lebego-foglalas-gomb')).toHaveCount(0);

    await page.getByRole('tab', { name: 'Regisztráció' }).click();
    const phoneFieldBorders = await page.locator('#fiok-regisztracio-form .fiok-telefon-mezo').evaluate(field => {
        const input = field.querySelector('input');
        return {
            field: getComputedStyle(field).borderTopWidth,
            input: getComputedStyle(input).borderTopWidth
        };
    });
    expect(phoneFieldBorders.field).not.toBe('0px');
    expect(phoneFieldBorders.input).toBe('0px');
});

test('a migráció és az Edge Function megtartja a vendégfiók szerveroldali biztonsági határait', () => {
    const root = path.resolve(__dirname, '..');
    const migration = fs.readFileSync(path.join(root, 'supabase-customer-accounts-security.sql'), 'utf8');
    const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'create-booking-with-email', 'index.ts'), 'utf8');

    expect(migration).toContain('users.email_confirmed_at is not null');
    expect(migration).toContain('where bookings.customer_user_id = auth.uid()');
    expect(migration).toContain('revoke all on function public.get_my_booking_history(integer, integer) from public, anon');
    expect(migration).toContain('to service_role;');
    expect(migration).not.toContain('auth.jwt() -> \'user_metadata\'');
    expect(edge).toContain('authClient.auth.getUser(accessToken)');
    expect(edge).toContain('verifiedEmail !== customerEmail');
    expect(migration).toContain("values ('customer_accounts', jsonb_build_object('enabled', false))");
    expect(migration).toContain('create or replace function public.customer_accounts_ready');
    expect(migration).toContain('security invoker');
    expect(migration).toContain('user_id = (select auth.uid())');
    expect(migration.match(/if not public\.customer_accounts_ready\(\) then/g)).toHaveLength(2);
    expect(migration).toContain('select public.customer_accounts_ready()');
    expect(edge).toContain('create_booking_idempotent_for_user');
    expect(edge).not.toContain('body.customer_user_id');
});
