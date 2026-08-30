const { test, expect } = require('playwright/test');

test.describe('célzott elrendezési és olvashatósági ellenőrzés', () => {
    test('az új szolgáltatásoldal asztalon középre rendezett és átfedésmentes', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const response = await page.goto('/mukorom-epites-toltes/', { waitUntil: 'domcontentloaded' });
        expect(response.ok()).toBe(true);
        await page.waitForSelector('.seo-szolgaltatas-hero');

        const metrics = await page.evaluate(() => {
            const rect = selector => document.querySelector(selector).getBoundingClientRect();
            const hero = rect('.seo-szolgaltatas-hero');
            const heroCopy = rect('.seo-szolgaltatas-hero-szoveg');
            const introTitle = rect('.seo-szolgaltatas-bevezeto h2');
            const introCopy = rect('.seo-szolgaltatas-bevezeto > p');
            const kicker = rect('.seo-szolgaltatas-szekcio-szoveg .szekcio-kicker');
            const title = rect('.seo-szolgaltatas-szekcio-szoveg h2');
            const copy = rect('.seo-szolgaltatas-szekcio-szoveg p');
            return {
                overflow: document.documentElement.scrollWidth - window.innerWidth,
                heroLeft: hero.left,
                heroRight: window.innerWidth - hero.right,
                heroCopyLeft: heroCopy.left,
                heroCopyRight: window.innerWidth - heroCopy.right,
                introSeparated: introCopy.left > introTitle.right,
                kickerAboveTitle: kicker.bottom <= title.top,
                copyBesideTitle: copy.left > title.right
            };
        });

        expect(metrics.overflow).toBeLessThanOrEqual(1);
        expect(Math.abs(metrics.heroLeft - metrics.heroRight)).toBeLessThanOrEqual(1);
        expect(Math.abs(metrics.heroCopyLeft - metrics.heroCopyRight)).toBeLessThanOrEqual(1);
        expect(metrics.introSeparated).toBe(true);
        expect(metrics.kickerAboveTitle).toBe(true);
        expect(metrics.copyBesideTitle).toBe(true);
    });

    test('az új szolgáltatásoldalak címei nem nyúlnak a szövegoszlopba', async ({ page }) => {
        const paths = [
            '/mukorom-epites-toltes/',
            '/gel-lakk-tatabanya/',
            '/manikur-tatabanya/',
            '/korom-diszites-nail-art-tatabanya/'
        ];

        for (const width of [1280, 820]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const path of paths) {
                const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
                expect(response.ok(), `${width}px ${path}`).toBe(true);
                await page.evaluate(() => document.fonts.ready);
                const smallestGap = await page.evaluate(() => Math.min(...Array.from(
                    document.querySelectorAll('.seo-szolgaltatas-szekcio-szoveg')
                ).map(block => {
                    const heading = block.querySelector('h2');
                    const copy = block.querySelector('p');
                    const headingText = document.createRange();
                    headingText.selectNodeContents(heading);
                    const headingRect = headingText.getBoundingClientRect();
                    const copyRect = copy.getBoundingClientRect();
                    const verticallyBesideEachOther = headingRect.top < copyRect.bottom && headingRect.bottom > copyRect.top;
                    return verticallyBesideEachOther ? copyRect.left - headingRect.right : Number.POSITIVE_INFINITY;
                })));
                expect(smallestGap, `${width}px ${path}`).toBeGreaterThanOrEqual(8);
            }
        }
    });

    test('a foglalásellenőrző és a Saját Lumi asztali elrendezése rendezett', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });

        const booking = await page.evaluate(() => {
            const section = document.querySelector('#foglalas-ellenorzes');
            const intro = section.querySelector('.foglalas-kezelo-bevezeto').getBoundingClientRect();
            const card = section.querySelector('.foglalas-kezelo-kartya').getBoundingClientRect();
            const input = section.querySelector('input').getBoundingClientRect();
            const button = section.querySelector('button[type="submit"]').getBoundingClientRect();
            return {
                columns: getComputedStyle(section).gridTemplateColumns.split(' ').length,
                separated: card.left > intro.right,
                radius: Number.parseFloat(getComputedStyle(section).borderRadius),
                controlDelta: Math.abs(input.height - button.height)
            };
        });

        expect(booking.columns).toBe(2);
        expect(booking.separated).toBe(true);
        expect(booking.radius).toBeGreaterThanOrEqual(20);
        expect(booking.controlDelta).toBeLessThanOrEqual(1);

        await page.goto('/fiokom/', { waitUntil: 'domcontentloaded' });
        const account = await page.evaluate(() => {
            const panel = document.querySelector('#fiok-auth-panel').getBoundingClientRect();
            const cardStyle = getComputedStyle(document.querySelector('.fiok-auth-kartya'));
            return {
                centerDelta: Math.abs((panel.left + panel.width / 2) - window.innerWidth / 2),
                overflow: document.documentElement.scrollWidth - window.innerWidth,
                cardBackgroundImage: cardStyle.backgroundImage
            };
        });

        expect(account.centerDelta).toBeLessThanOrEqual(1);
        expect(account.overflow).toBeLessThanOrEqual(1);
        expect(account.cardBackgroundImage).toBe('none');
    });

    test('a főoldali Saját Lumi és bemutatkozás középre igazodik, az ellenőrző mezők két sorban vannak', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#fiok-ajanlo');

        const home = await page.evaluate(() => {
            const account = document.querySelector('#fiok-ajanlo');
            const accountInner = document.querySelector('.fiok-ajanlo-belso').getBoundingClientRect();
            const introImage = document.querySelector('.bemutatkozas-kep').getBoundingClientRect();
            const introCopy = document.querySelector('.bemutatkozas-szoveg').getBoundingClientRect();
            return {
                accountCenterDelta: Math.abs(accountInner.left + accountInner.width / 2 - window.innerWidth / 2),
                accountBackgroundImage: getComputedStyle(account).backgroundImage,
                introColumnDelta: Math.abs(introImage.width - introCopy.width),
                removedIntroLink: !document.querySelector('.bemutatkozas-szoveg > .szoveges-link')
            };
        });

        expect(home.accountCenterDelta).toBeLessThanOrEqual(1);
        expect(home.accountBackgroundImage).toBe('none');
        expect(home.introColumnDelta).toBeLessThanOrEqual(1);
        expect(home.removedIntroLink).toBe(true);

        await page.goto('/foglalas/', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#foglalas-elerhetoseg');
        const fields = await page.evaluate(() => {
            const reference = document.querySelector('#foglalas-azonosito').getBoundingClientRect();
            const contact = document.querySelector('#foglalas-elerhetoseg');
            const contactRect = contact.getBoundingClientRect();
            return {
                contactBelowReference: contactRect.top >= reference.bottom - 1,
                placeholder: contact.placeholder,
                columns: getComputedStyle(document.querySelector('.foglalas-kezelo-biztonsagi-mezok')).gridTemplateColumns.split(' ').length
            };
        });

        expect(fields.contactBelowReference).toBe(true);
        expect(fields.placeholder).toContain('pelda@email.hu');
        expect(fields.columns).toBe(1);
    });

    test('az árlista a típust és a szolgáltatást hangsúlyozza az idő helyett', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto('/arlista/', { waitUntil: 'domcontentloaded' });

        const sizes = await page.evaluate(() => ({
            category: Number.parseFloat(getComputedStyle(document.querySelector('.arlista-csoport h3')).fontSize),
            service: Number.parseFloat(getComputedStyle(document.querySelector('.arlista-sor > span')).fontSize),
            time: Number.parseFloat(getComputedStyle(document.querySelector('.arlista-ido')).fontSize)
        }));

        expect(sizes.category).toBeGreaterThanOrEqual(28);
        expect(sizes.service).toBeGreaterThanOrEqual(20);
        expect(sizes.time).toBeLessThanOrEqual(12);
        expect(sizes.time).toBeLessThan(sizes.service);
    });

    test('az admin fő feliratai olvasható méretűek', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.admin-v2-page-heading h1', { state: 'attached' });

        const sizes = await page.evaluate(() => {
            const bookingPanel = document.querySelector('#admin-panel-foglalasok');
            const bookingBlock = document.createElement('div');
            bookingBlock.className = 'admin-foglalas-nev-blokk';
            bookingBlock.innerHTML = '<h3>Próba vendég</h3>';
            bookingPanel.appendChild(bookingBlock);

            const contentPanel = document.querySelector('#admin-panel-szovegek');
            const fieldset = document.createElement('details');
            fieldset.className = 'cms-fieldset';
            fieldset.innerHTML = '<summary>Próba tartalmi rész</summary>';
            contentPanel.appendChild(fieldset);

            const font = selector => Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
            return {
                body: font('body'),
                nav: font('.admin-v2-nav-item'),
                heading: font('.admin-v2-page-heading h1'),
                statLabel: font('.admin-v2-stat-card p'),
                bookingName: font('#admin-panel-foglalasok .admin-foglalas-nev-blokk h3'),
                contentSummary: font('#admin-panel-szovegek .cms-fieldset summary')
            };
        });

        expect(sizes.body).toBeGreaterThanOrEqual(16);
        expect(sizes.nav).toBeGreaterThanOrEqual(14);
        expect(sizes.heading).toBeGreaterThanOrEqual(30);
        expect(sizes.statLabel).toBeGreaterThanOrEqual(12);
        expect(sizes.bookingName).toBeGreaterThanOrEqual(16);
        expect(sizes.contentSummary).toBeGreaterThanOrEqual(15);
    });

    test('mobilon az érintett publikus oldalak nem lógnak ki', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        for (const path of ['/mukorom-epites-toltes/', '/foglalas/', '/fiokom/', '/arlista/']) {
            const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
            expect(response.ok(), path).toBe(true);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            expect(overflow, path).toBeLessThanOrEqual(1);
        }
    });
});
