const metaThemeColor = document.createElement('meta');
metaThemeColor.name = 'theme-color';
metaThemeColor.content = '#fdf4e2';
document.head.appendChild(metaThemeColor);

let galeriaAktualisIndex = 0;
let galeriaKepek = [];
let galeriaHuzasKezdoX = 0;
let galeriaHuzasKezdoY = 0;
let galeriaHuzasAktiv = false;

document.addEventListener('DOMContentLoaded', function () {
    tisztaUrlBeallitasa();
    Promise.all([fejlecBetoltese(), lablecBetoltese()])
        .then(() => adatokBetoltese())
        .then(async adatok => {
            oldalAdatokAlkalmazasa(adatok);
            await onlineTelefonLathatosagAlkalmazasa();
            await onlineArlistaBetoltese();
            galeriaBekotese();
        })
        .catch(error => {
            console.warn('Lumi Nails tartalom betöltési hiba:', error);
        })
        .finally(() => oldalTartalomMegjelenitese());
    idopontokGeneralasa();
    datumMinimumBeallitasa();
    foglalasiUrlapBekotese();
    galeriaBekotese();
    lebegoFoglalasLetrehozasa();
    lebegoFoglalasFigyeles();
});

function lumiAlapOldalAdatok() {
    return {
        marka: {
            nev: 'Lumi Nails',
            rovidLeiras: 'Letisztult, nőies körmök Tatabányán, személyes figyelemmel és precíz részletekkel.'
        },
        navigacio: {
            kezdolap: 'Kezdőlap',
            szolgaltatasok: 'Szolgáltatások',
            arlista: 'Árlista',
            galeria: 'Galéria',
            foglalas: 'Foglalás'
        },
        lablec: {
            jogiLink: 'Adatkezelési tájékoztató',
            jogok: '© Lumi Nails. Minden jog fenntartva.'
        },
        seo: {
            fooldalCim: 'Lumi Nails - Körmös és manikűr Tatabánya',
            fooldalLeiras: 'Lumi Nails Tatabányán: manikűr, gél lakk, körömépítés, töltés és díszítés online időpontfoglalással.',
            megosztasiKep: '/kepek/social-preview.jpg'
        },
        kapcsolat: {
            cimke: 'Elérhetőség',
            cim: '2800 Tatabánya, Kós Károly út',
            terkepUrl: 'https://www.google.com/maps/search/?api=1&query=2800%20Tatab%C3%A1nya%2C%20K%C3%B3s%20K%C3%A1roly%20%C3%BAt',
            telefon: '',
            telefonLink: '',
            telefonLathato: false,
            email: '',
            instagram: 'https://www.instagram.com/luminails.xx/',
            facebook: 'https://www.facebook.com/profile.php?id=61576508698202',
            messenger: 'https://m.me/61576508698202',
            instagramUzenet: 'https://ig.me/m/luminails.xx'
        },
        fooldal: {
            hero: {
                kicker: 'Körmös Tatabánya',
                cim: 'Lumi Nails',
                leiras: 'Elegáns manikűr, gél lakk és körömépítés személyes figyelemmel.',
                kep: '/kepek/hatter2.jpg',
                kepAlt: 'Lumi Nails nyitókép'
            },
            bemutatkozas: {
                cim: 'Bemutatkozás',
                bekezdesek: [
                    'Szia, Szofi vagyok, a Lumi Nails mögött álló körmös. Munka mellett, nagyjából egy éve foglalkozom körmökkel, és minden vendégnél arra figyelek, hogy a végeredmény igényes, hordható és a saját stílusához passzoló legyen.',
                    'A célom, hogy idővel főállásban is ezzel foglalkozhassak, ezért minden elkészült szett számomra fejlődés, figyelem és egy kis lépés afelé, amit igazán szeretek csinálni.'
                ],
                kep: '/kepek/bemutatkozas-kep.jpg',
                kepAlt: 'Lumi Nails köröm munka részlete'
            },
            szolgaltatasok: {
                cim: 'SZOLGÁLTATÁSOK',
                arlistaGomb: 'Árlista megtekintése',
                kartyak: [
                    { cim: 'Körömépítés & Töltés', leiras: 'S, M és L méretű zselés vagy porcelán műkörmök\nprecíz felhelyezése és rendszeres karbantartása.', szeles: true },
                    { cim: 'Díszítés / Nail Art', leiras: 'Egyedi minták, matricák, strasszkövek, beépített francia és különleges 3D dekorációk.', szeles: false },
                    { cim: 'Gél Lakk', leiras: 'Hagyományos és erősített technika a tartós, ragyogó színekért, amelyek hetekig hibátlanok maradnak.', szeles: false },
                    { cim: 'Manikűr', leiras: 'Klasszikus körömápolás, gél lakk szakszerű eltávolítása\nés a kezek kényeztető felfrissítése.', szeles: true }
                ]
            },
            galeriaAtvezeto: {
                cim: 'Galéria',
                leiras: 'Nézd meg a korábbi munkákat, színeket és formákat inspirációként a következő időpontodhoz.',
                gombSzoveg: 'Galéria megnyitása',
                kepek: [
                    { src: '/kepek/galeria-atvezeto-1.jpg', alt: 'Lumi Nails köröm munka' },
                    { src: '/kepek/galeria-atvezeto-2.jpg', alt: 'Lumi Nails díszített köröm' },
                    { src: '/kepek/galeria-atvezeto-3.jpg', alt: 'Lumi Nails elegáns manikűr' }
                ]
            },
            kiemeltStilusok: {
                cimke: 'Inspiráció',
                cim: 'Kiemelt stílusok',
                leiras: 'Letisztult, nőies és hordható körmök, amelyek közelről is szépen mutatnak.',
                kartyak: [
                    {
                        cim: 'Finom fények',
                        leiras: 'Elegáns, visszafogott hatás a mindennapokra.',
                        kep: '/kepek/galeria-atvezeto-1.jpg',
                        kepAlt: 'Fényes Lumi Nails köröm részlet'
                    },
                    {
                        cim: 'Apró részletek',
                        leiras: 'Díszítés akkor, ha valami különlegesebb kell.',
                        kep: '/kepek/galeria-atvezeto-2.jpg',
                        kepAlt: 'Díszített Lumi Nails köröm részlet'
                    },
                    {
                        cim: 'Természetes forma',
                        leiras: 'Nőies, tiszta összhatás kényelmes hosszal.',
                        kep: '/kepek/galeria-atvezeto-3.jpg',
                        kepAlt: 'Elegáns Lumi Nails manikűr részlet'
                    }
                ]
            },
            foglalasAtvezeto: {
                cim: 'Időpontfoglalás',
                leiras: 'Válaszd ki a neked megfelelő szabad sávot online rendszerünkben.',
                gombSzoveg: 'Online Időpontfoglalás'
            }
        },
        arlista: {
            cim: 'Árlista',
            leiras: 'Az árak tájékoztató jellegűek, a pontos végösszeg az egyedi igényektől és díszítéstől függhet.'
        },
        galeria: {
            cim: 'Galéria',
            leiras: 'Finom részletek, letisztult formák és visszafogottan elegáns díszítések egy helyen.',
            foglalasGomb: 'Időpontfoglalás',
            elemek: [
                { kep: '/galeria/optimized/large/image3.jpg', eloKep: '/galeria/optimized/thumbs/image3.jpg', kepAlt: 'Lumi Nails köröm munka', magas: true },
                { kep: '/galeria/optimized/large/image8.jpg', eloKep: '/galeria/optimized/thumbs/image8.jpg', kepAlt: 'Lumi Nails díszített köröm', magas: true },
                { kep: '/galeria/optimized/large/image6.jpg', eloKep: '/galeria/optimized/thumbs/image6.jpg', kepAlt: 'Lumi Nails elegáns manikűr', magas: true },
                { kep: '/galeria/optimized/large/image0.jpg', eloKep: '/galeria/optimized/thumbs/image0.jpg', kepAlt: 'Lumi Nails köröm inspiráció', magas: false },
                { kep: '/galeria/optimized/large/image1.jpg', eloKep: '/galeria/optimized/thumbs/image1.jpg', kepAlt: 'Lumi Nails gél lakk munka', magas: false },
                { kep: '/galeria/optimized/large/image2.jpg', eloKep: '/galeria/optimized/thumbs/image2.jpg', kepAlt: 'Lumi Nails körömdíszítés', magas: false },
                { kep: '/galeria/optimized/large/image4.jpg', eloKep: '/galeria/optimized/thumbs/image4.jpg', kepAlt: 'Lumi Nails manikűr részlet', magas: false },
                { kep: '/galeria/optimized/large/image5.jpg', eloKep: '/galeria/optimized/thumbs/image5.jpg', kepAlt: 'Lumi Nails letisztult köröm', magas: false },
                { kep: '/galeria/optimized/large/image7.jpg', eloKep: '/galeria/optimized/thumbs/image7.jpg', kepAlt: 'Lumi Nails szalonmunka', magas: false },
                { kep: '/galeria/optimized/large/image9.jpg', eloKep: '/galeria/optimized/thumbs/image9.jpg', kepAlt: 'Lumi Nails köröm szín', magas: false },
                { kep: '/galeria/optimized/large/image10.jpg', eloKep: '/galeria/optimized/thumbs/image10.jpg', kepAlt: 'Lumi Nails elegáns köröm', magas: false },
                { kep: '/galeria/optimized/large/image11.jpg', eloKep: '/galeria/optimized/thumbs/image11.jpg', kepAlt: 'Lumi Nails köröm forma', magas: false },
                { kep: '/galeria/optimized/large/image12.jpg', eloKep: '/galeria/optimized/thumbs/image12.jpg', kepAlt: 'Lumi Nails nail art', magas: false }
            ]
        },
        foglalas: {
            cim: 'Időpontfoglalás',
            leiras: 'Válassz szolgáltatást, dátumot és szabad időpontot. A foglalás után visszaigazoló üzenetet kapsz.',
            nevPlaceholder: 'Teljes neved',
            telefonPlaceholder: '201234567',
            emailPlaceholder: 'Email címed',
            megjegyzesPlaceholder: 'Megjegyzés, egyedi kérés (opcionális)',
            kuldesGomb: 'Foglalás elküldése',
            lebegoGomb: 'Időpontfoglalás',
            popup: {
                sikeresCim: 'Foglalás elküldve',
                sikeresSzoveg: 'Köszönöm, megkaptam a foglalásodat. A részleteket emailben is elküldjük, kérlek ellenőrizd a spam mappát is.',
                tartalekCim: 'Adatok előkészítve',
                tartalekSzoveg: 'A böngésződ most nem engedte az automatikus másolást. Jelöld ki az alábbi szöveget, másold ki, majd küldd el üzenetben.',
                kezdolapGomb: 'Kezdőlap',
                galeriaGomb: 'Galéria',
                naptarGomb: 'Naptárba mentés',
                bezarasGomb: 'Bezárás',
                messengerGomb: 'Messenger',
                instagramGomb: 'Instagram'
            }
        }
    };
}

window.lumiAlapOldalAdatok = lumiAlapOldalAdatok;

function tisztaUrlBeallitasa() {
    const tisztaUtvonalak = {
        '/index.html': '/',
        '/arlista.html': '/arlista/',
        '/arlista/index.html': '/arlista/',
        '/galeria.html': '/galeria/',
        '/galeria/index.html': '/galeria/',
        '/foglalas.html': '/foglalas/',
        '/foglalas/index.html': '/foglalas/',
        '/admin.html': '/admin/',
        '/admin/index.html': '/admin/'
    };
    const tisztaUtvonal = tisztaUtvonalak[window.location.pathname];

    if (tisztaUtvonal) {
        window.history.replaceState(null, '', tisztaUtvonal + window.location.search + window.location.hash);
    }
}

function fejlecBetoltese() {
    const fejlecHelye = document.getElementById('fejlec-helye');

    if (!fejlecHelye) {
        return Promise.resolve();
    }

    fejlecHelye.innerHTML = `
        <header>
            <a href="/" class="logo" aria-label="Lumi Nails kezdőlap">Lumi Nails</a>

            <nav class="menu-pontok" aria-label="Fő navigáció">
                <a href="/">Kezdőlap</a>
                <a href="/#szolgaltatasok">Szolgáltatások</a>
                <a href="/arlista/">Árlista</a>
                <a href="/galeria/">Galéria</a>
                <a href="/foglalas/">Foglalás</a>
            </nav>

            <button type="button" class="hamburger" aria-label="Menü megnyitása">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </header>

        <nav id="mobil-nav" class="mobile-menu" aria-label="Mobil navigáció">
            <a href="/">Kezdőlap</a>
            <a href="/#szolgaltatasok">Szolgáltatások</a>
            <a href="/arlista/">Árlista</a>
            <a href="/galeria/">Galéria</a>
            <a href="/foglalas/">Foglalás</a>
        </nav>
    `;

    menuEsemenyekBekotese();
    aktivMenuJelolese();
    return Promise.resolve();
}

function lablecBetoltese() {
    const lablecHelye = document.getElementById('lablec-helye');

    if (!lablecHelye) {
        return Promise.resolve();
    }

    lablecHelye.innerHTML = `
        <footer class="site-footer">
            <div class="footer-belso">
                <div class="footer-brand">
                    <a href="/" class="footer-logo">Lumi Nails</a>
                    <p>Letisztult, nőies körmök Tatabányán, személyes figyelemmel és precíz részletekkel.</p>
                </div>

                <div class="footer-kapcsolat">
                    <h3>Elérhetőség</h3>
                    <address>
                        <a href="https://www.google.com/maps/search/?api=1&query=2800%20Tatab%C3%A1nya%2C%20K%C3%B3s%20K%C3%A1roly%20%C3%BAt" target="_blank" rel="noopener">2800 Tatabánya, Kós Károly út</a>
                        <a data-footer-phone href="#" hidden style="display: none;"></a>
                        <a data-footer-email href="#" hidden style="display: none;"></a>
                        <a class="footer-jogi-link" href="/adatkezeles/">Adatkezelési tájékoztató</a>
                    </address>
                </div>

                <div class="footer-social">
                    <div class="social-linkek">
                        <a class="social-gomb" href="https://www.instagram.com/luminails.xx/" target="_blank" rel="noopener" aria-label="Lumi Nails Instagram" title="Instagram">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="5"></rect>
                                <circle cx="12" cy="12" r="4"></circle>
                                <circle cx="17.5" cy="6.5" r="1"></circle>
                            </svg>
                        </a>
                        <a class="social-gomb" href="https://www.facebook.com/profile.php?id=61576508698202" target="_blank" rel="noopener" aria-label="Lumi Nails Facebook" title="Facebook">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M13.7 21v-8h2.7l.4-3h-3.1V8.2c0-.9.3-1.5 1.6-1.5H17V3.1C16.2 3 15.5 3 14.7 3c-2.5 0-4.2 1.5-4.2 4.2V10H8v3h2.5v8h3.2z"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
            <p class="footer-jogok">© Lumi Nails. Minden jog fenntartva.</p>
        </footer>
    `;

    const kezdoCimLink = lablecHelye.querySelector('.footer-kapcsolat address a:not(.footer-jogi-link)');

    if (kezdoCimLink) {
        kezdoCimLink.dataset.footerAddress = '';
        kezdoCimLink.textContent = '';
        kezdoCimLink.href = '#';
        kezdoCimLink.hidden = true;
        kezdoCimLink.style.display = 'none';
    }

    return Promise.resolve();
}

function oldalTartalomMegjelenitese() {
    document.body.classList.remove('tartalom-toltes');
}

function menuEsemenyekBekotese() {
    const hamburger = document.querySelector('.hamburger');
    const mobilLinkek = document.querySelectorAll('#mobil-nav a');

    if (hamburger) {
        hamburger.addEventListener('click', menuToggle);
    }

    mobilLinkek.forEach(link => {
        link.addEventListener('click', menuBezarasa);
    });
}

function menuToggle() {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');

    if (menu) {
        menu.classList.toggle('open');
    }

    if (hamburger) {
        hamburger.classList.toggle('open');
    }
}

function menuBezarasa() {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');

    if (menu) {
        menu.classList.remove('open');
    }

    if (hamburger) {
        hamburger.classList.remove('open');
    }
}

function aktivMenuJelolese() {
    const aktualis = normalizaltUtvonal(window.location.pathname);
    const hash = window.location.hash;

    document.querySelectorAll('header nav a').forEach(link => {
        const linkUtvonal = normalizaltUtvonal(new URL(link.href).pathname);
        const szolgaltatasLink = link.hash === '#szolgaltatasok';
        const aktiv = szolgaltatasLink && hash === '#szolgaltatasok'
            ? true
            : !szolgaltatasLink && linkUtvonal === aktualis;

        link.classList.toggle('aktiv', aktiv);
    });
}

function normalizaltUtvonal(utvonal) {
    const htmlOldalak = {
        '/index.html': '/',
        '/arlista.html': '/arlista/',
        '/arlista/index.html': '/arlista/',
        '/galeria.html': '/galeria/',
        '/galeria/index.html': '/galeria/',
        '/foglalas.html': '/foglalas/',
        '/foglalas/index.html': '/foglalas/',
        '/admin.html': '/admin/',
        '/admin/index.html': '/admin/'
    };

    return htmlOldalak[utvonal] || utvonal;
}

function adatokBetoltese() {
    const alap = lumiAlapOldalAdatok();

    return onlineOldalAdatokBetoltese()
        .then(onlineAdatok => {
            if (onlineAdatok) {
                return melyOsszefesules(alap, onlineAdatok);
            }

            return fetch(`/adatok.json?v=${Date.now()}`, { cache: 'no-store' })
                .then(response => response.ok ? response.json() : null)
                .then(jsonAdatok => jsonAdatok ? melyOsszefesules(alap, jsonAdatok) : alap)
                .catch(() => alap);
        });
}

async function onlineOldalAdatokBetoltese() {
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return null;
    }

    try {
        const kliens = supabaseLib.createClient(config.url, config.publishableKey);
        const { data, error } = await kliens
            .from('site_settings')
            .select('value')
            .eq('key', 'site_content')
            .maybeSingle();

        if (error || !data?.value) {
            return null;
        }

        return data.value;
    } catch (_error) {
        return null;
    }
}

function melyOsszefesules(alap, feluliras) {
    if (Array.isArray(alap)) {
        return Array.isArray(feluliras) ? feluliras : alap;
    }

    if (!alap || typeof alap !== 'object') {
        return feluliras ?? alap;
    }

    const eredmeny = { ...alap };
    const plusz = feluliras && typeof feluliras === 'object' ? feluliras : {};

    Object.keys(plusz).forEach(kulcs => {
        eredmeny[kulcs] = melyOsszefesules(alap[kulcs], plusz[kulcs]);
    });

    return eredmeny;
}

function oldalAdatokAlkalmazasa(adatok) {
    if (!adatok) {
        return;
    }

    window.lumiAdatok = adatok;
    fejlecAdatokAlkalmazasa(adatok);
    fooldalAdatokAlkalmazasa(adatok.fooldal);
    arlistaAdatokAlkalmazasa(adatok.arlista);
    galeriaAdatokAlkalmazasa(adatok.galeria);
    foglalasAdatokAlkalmazasa(adatok.foglalas, adatok.arlista);
    lablecAdatokAlkalmazasa(adatok);
    seoAdatokAlkalmazasa(adatok.seo);
}

function fejlecAdatokAlkalmazasa(adatok) {
    const marka = adatok?.marka;
    const navigacio = adatok?.navigacio;
    szovegBeallitasa('header .logo', marka?.nev);
    document.querySelectorAll('header .logo').forEach(link => {
        link.setAttribute('aria-label', `${marka?.nev || 'Lumi Nails'} kezdőlap`);
    });

    const linkek = [
        ['a[href="/"]', navigacio?.kezdolap],
        ['a[href="/#szolgaltatasok"]', navigacio?.szolgaltatasok],
        ['a[href="/arlista/"]', navigacio?.arlista],
        ['a[href="/galeria/"]', navigacio?.galeria],
        ['a[href="/foglalas/"]', navigacio?.foglalas]
    ];
    ['header .menu-pontok', '#mobil-nav'].forEach(gyokerSelector => {
        const gyoker = document.querySelector(gyokerSelector);
        if (!gyoker) return;
        linkek.forEach(([selector, felirat]) => szovegBeallitasa(selector, felirat, gyoker));
    });
}

function galeriaAdatokAlkalmazasa(galeria) {
    const szekcio = document.querySelector('.galeria-oldal');
    const racs = szekcio?.querySelector('.galeria-racs');
    if (!szekcio || !galeria || !racs) return;

    szovegBeallitasa('h2', galeria.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', galeria.leiras, szekcio);
    szovegBeallitasa('a.gomb[href*="foglalas"]', galeria.foglalasGomb, szekcio);

    if (!Array.isArray(galeria.elemek)) return;
    racs.innerHTML = '';
    galeria.elemek.filter(elem => elem?.kep).forEach(elem => {
        const gomb = document.createElement('button');
        gomb.type = 'button';
        gomb.className = `galeria-kep-gomb${elem.magas ? ' magas' : ''}`;
        gomb.dataset.src = elem.kep;
        gomb.dataset.alt = elem.kepAlt || 'Lumi Nails köröm munka';
        const kep = document.createElement('img');
        kep.src = elem.eloKep || elem.kep;
        kep.alt = elem.kepAlt || 'Lumi Nails köröm munka';
        kep.loading = 'lazy';
        gomb.appendChild(kep);
        racs.appendChild(gomb);
    });
}

function seoAdatokAlkalmazasa(seo) {
    if (!seo || window.location.pathname !== '/' && !window.location.pathname.endsWith('/index.html')) return;
    if (seo.fooldalCim) document.title = seo.fooldalCim;
    const description = document.querySelector('meta[name="description"]');
    if (description && seo.fooldalLeiras) description.content = seo.fooldalLeiras;
    document.querySelectorAll('meta[property="og:title"]').forEach(meta => {
        if (seo.fooldalCim) meta.content = seo.fooldalCim;
    });
    document.querySelectorAll('meta[property="og:description"]').forEach(meta => {
        if (seo.fooldalLeiras) meta.content = seo.fooldalLeiras;
    });
    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(meta => {
        if (seo.megosztasiKep) meta.content = new URL(seo.megosztasiKep, window.location.origin).href;
    });
}

function szovegBeallitasa(selector, ertek, gyoker = document) {
    const elem = gyoker.querySelector(selector);

    if (elem && ertek !== undefined && ertek !== null) {
        elem.textContent = ertek;
    }
}

function htmlSzovegBeallitasa(selector, ertek, gyoker = document) {
    const elem = gyoker.querySelector(selector);

    if (elem && ertek !== undefined && ertek !== null) {
        elem.innerHTML = sortoresesSzoveg(ertek);
    }
}

function sortoresesSzoveg(ertek) {
    const div = document.createElement('div');
    div.textContent = ertek;
    return div.innerHTML.replace(/\n/g, '<br>');
}

function html(ertek) {
    const div = document.createElement('div');
    div.textContent = ertek ?? '';
    return div.innerHTML;
}

function attr(ertek) {
    return html(ertek).replace(/"/g, '&quot;');
}

function fooldalAdatokAlkalmazasa(fooldal) {
    if (!fooldal) {
        return;
    }

    szovegBeallitasa('.hero-kicker', fooldal.hero?.kicker);
    szovegBeallitasa('.hero-content h1', fooldal.hero?.cim);
    szovegBeallitasa('.hero-content p', fooldal.hero?.leiras);
    const hero = document.getElementById('hero');
    if (hero && fooldal.hero?.kep) {
        hero.style.backgroundImage = `linear-gradient(90deg, rgba(43, 37, 33, 0.04) 0%, rgba(43, 37, 33, 0.12) 42%, rgba(43, 37, 33, 0.74) 100%), url("${fooldal.hero.kep.replace(/"/g, '%22')}")`;
        if (fooldal.hero.kepAlt) hero.setAttribute('aria-label', fooldal.hero.kepAlt);
        hero.setAttribute('role', 'img');
    }

    szovegBeallitasa('.bemutatkozas-szoveg h2', fooldal.bemutatkozas?.cim);
    bekezdesekRenderelese('.bemutatkozas-szoveg', fooldal.bemutatkozas?.bekezdesek);
    kepBeallitasa('.bemutatkozas-kep img', fooldal.bemutatkozas?.kep, fooldal.bemutatkozas?.kepAlt);

    szolgaltatasKartyakRenderelese(fooldal.szolgaltatasok);
    kiemeltStilusokRenderelese(fooldal.kiemeltStilusok);
    galeriaAtvezetoAlkalmazasa(fooldal.galeriaAtvezeto);
    foglalasAtvezetoAlkalmazasa(fooldal.foglalasAtvezeto);
}

function bekezdesekRenderelese(selector, bekezdesek) {
    const kontener = document.querySelector(selector);
    const cim = kontener?.querySelector('h2');

    if (!kontener || !Array.isArray(bekezdesek)) {
        return;
    }

    kontener.querySelectorAll('p').forEach(p => p.remove());
    bekezdesek.forEach(szoveg => {
        const p = document.createElement('p');
        p.textContent = szoveg;
        kontener.appendChild(p);
    });

    if (cim && cim.parentElement !== kontener) {
        kontener.prepend(cim);
    }
}

function kepBeallitasa(selector, src, alt) {
    const kep = document.querySelector(selector);

    if (!kep) {
        return;
    }

    if (src) kep.src = src;
    if (alt) kep.alt = alt;
}

function szolgaltatasKartyakRenderelese(szolgaltatasok) {
    const szekcio = document.getElementById('szolgaltatasok');
    const racs = szekcio?.querySelector('.bento-racs');

    if (!szekcio || !racs || !Array.isArray(szolgaltatasok?.kartyak)) {
        return;
    }

    szovegBeallitasa('h2', szolgaltatasok.cim, szekcio);
    szovegBeallitasa('.szolgaltatas-arlista-gomb', szolgaltatasok.arlistaGomb, szekcio);
    racs.innerHTML = '';

    szolgaltatasok.kartyak.forEach(kartya => {
        const doboz = document.createElement('div');
        doboz.className = `bento-kartya${kartya.szeles ? ' szeles' : ''}`;

        const cim = document.createElement('h3');
        cim.textContent = kartya.cim || '';

        const leiras = document.createElement('p');
        leiras.innerHTML = sortoresesSzoveg(kartya.leiras || '');

        doboz.append(cim, leiras);
        racs.appendChild(doboz);
    });
}

function kiemeltStilusokRenderelese(stilusok) {
    const szekcio = document.getElementById('kiemelt-stilusok');
    const racs = szekcio?.querySelector('.kiemelt-stilusok-racs');

    if (!szekcio || !racs || !stilusok) {
        return;
    }

    szovegBeallitasa('.kiemelt-stilusok-cimke', stilusok.cimke, szekcio);
    szovegBeallitasa('h2', stilusok.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', stilusok.leiras, szekcio);
    racs.innerHTML = '';

    (stilusok.kartyak || []).forEach((kartya, index) => {
        const elem = document.createElement('article');
        elem.className = 'kiemelt-stilus-kartya';
        elem.innerHTML = `
            <img src="${attr(kartya.kep || '')}" alt="${attr(kartya.kepAlt || kartya.cim || 'Lumi Nails köröm részlet')}" loading="lazy">
            <div>
                <span>${String(index + 1).padStart(2, '0')}</span>
                <h3>${html(kartya.cim || '')}</h3>
                <p>${html(kartya.leiras || '')}</p>
            </div>
        `;

        racs.appendChild(elem);
    });
}

function galeriaAtvezetoAlkalmazasa(galeria) {
    const szekcio = document.getElementById('galeria-atvezeto');

    if (!szekcio || !galeria) {
        return;
    }

    szovegBeallitasa('.galeria-atvezeto-szoveg h2', galeria.cim);
    szovegBeallitasa('.galeria-atvezeto-szoveg .szekcio-leiras', galeria.leiras);
    szovegBeallitasa('.galeria-atvezeto-szoveg .gomb', galeria.gombSzoveg);

    const kepek = szekcio.querySelectorAll('.galeria-atvezeto-kepek img');
    (galeria.kepek || []).forEach((kep, index) => {
        if (!kepek[index]) {
            return;
        }

        if (kep.src) kepek[index].src = kep.src;
        if (kep.alt) kepek[index].alt = kep.alt;
    });
}

function foglalasAtvezetoAlkalmazasa(foglalasAtvezeto) {
    const szekcio = document.getElementById('kapcsolat');

    if (!szekcio || !foglalasAtvezeto) {
        return;
    }

    szovegBeallitasa('h2', foglalasAtvezeto.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', foglalasAtvezeto.leiras, szekcio);
    szovegBeallitasa('.gomb', foglalasAtvezeto.gombSzoveg, szekcio);
}

function arlistaAdatokAlkalmazasa(arlista) {
    const szekcio = document.querySelector('.arlista-oldal');
    const panel = szekcio?.querySelector('.arlista-panel');

    if (!szekcio || !arlista) {
        return;
    }

    szovegBeallitasa('h2', arlista.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', arlista.leiras, szekcio);

    if (!panel || !Array.isArray(arlista.csoportok)) {
        return;
    }

    panel.innerHTML = '';

    const felsoCsoportok = arlista.csoportok.slice(0, 2);
    const alsoCsoportok = arlista.csoportok.slice(2);

    if (felsoCsoportok.length) {
        const ketOszlop = document.createElement('div');
        ketOszlop.className = 'arlista-ket-oszlop';
        felsoCsoportok.forEach(csoport => ketOszlop.appendChild(arlistaCsoportLetrehozasa(csoport)));
        panel.appendChild(ketOszlop);
    }

    alsoCsoportok.forEach(csoport => panel.appendChild(arlistaCsoportLetrehozasa(csoport)));

    if (arlista.megjegyzes) {
        const megjegyzes = document.createElement('p');
        megjegyzes.className = 'arlista-megjegyzes';
        megjegyzes.textContent = arlista.megjegyzes;
        panel.appendChild(megjegyzes);
    }
}

function arlistaCsoportLetrehozasa(csoport) {
    const doboz = document.createElement('div');
    doboz.className = 'arlista-csoport';

    const cim = document.createElement('h3');
    cim.textContent = csoport.cim || '';
    doboz.appendChild(cim);

    (csoport.tetelek || []).forEach(tetel => {
        const sor = document.createElement('div');
        sor.className = 'arlista-sor';

        const nev = document.createElement('span');
        nev.textContent = tetel.nev || '';

        const reszlet = document.createElement('strong');
        const ar = document.createElement('span');
        ar.className = 'arlista-ar';
        ar.textContent = tetel.ar || '';

        reszlet.appendChild(ar);

        const idoSzoveg = idoMegjelenitese(tetel);

        if (idoSzoveg) {
            const ido = document.createElement('span');
            ido.className = 'arlista-ido';
            ido.textContent = idoSzoveg;
            reszlet.appendChild(ido);
        }

        sor.append(nev, reszlet);
        doboz.appendChild(sor);
    });

    return doboz;
}

function foglalasAdatokAlkalmazasa(foglalas, arlista) {
    if (!foglalas) {
        return;
    }

    const urlap = document.querySelector('.urlap-kontener');
    const supabaseFoglalas = document.body.dataset.bookingMode === 'supabase';

    if (urlap) {
        const szekcio = urlap.closest('section');

        szovegBeallitasa('h2', foglalas.cim, szekcio);
        htmlSzovegBeallitasa('.urlap-leiras', foglalas.leiras, szekcio);
        szovegBeallitasa('#foglalas-kuldes', foglalas.kuldesGomb, szekcio);
        const nevMezo = szekcio.querySelector('#foglalas-nev');
        const telefonMezo = szekcio.querySelector('#foglalas-tel');
        const emailMezo = szekcio.querySelector('#foglalas-email');
        const megjegyzesMezo = szekcio.querySelector('#foglalas-komment');
        if (nevMezo && foglalas.nevPlaceholder) nevMezo.placeholder = foglalas.nevPlaceholder;
        if (telefonMezo && foglalas.telefonPlaceholder) telefonMezo.placeholder = foglalas.telefonPlaceholder;
        if (emailMezo && foglalas.emailPlaceholder) emailMezo.placeholder = foglalas.emailPlaceholder;
        if (megjegyzesMezo && foglalas.megjegyzesPlaceholder) megjegyzesMezo.placeholder = foglalas.megjegyzesPlaceholder;
        szovegBeallitasa('.popup-cim', foglalas.popup?.sikeresCim);
        htmlSzovegBeallitasa('.popup-szoveg', foglalas.popup?.sikeresSzoveg);
        szovegBeallitasa('#popup-bezaras', foglalas.popup?.bezarasGomb);
        szovegBeallitasa('.popup-gomb[href="/"]', foglalas.popup?.kezdolapGomb);
        szovegBeallitasa('.popup-gomb[href="/galeria/"]', foglalas.popup?.galeriaGomb);
        szovegBeallitasa('#naptar-link', foglalas.popup?.naptarGomb);

        if (!supabaseFoglalas) {
            szovegBeallitasa('.popup-gomb[href*="m.me"]', foglalas.popup?.messengerGomb);
            szovegBeallitasa('.popup-gomb[href*="ig.me"]', foglalas.popup?.instagramGomb);
            foglalasiSzolgaltatasokRenderelese(arlistaSzolgaltatasokLetrehozasa(arlista));
        }
    }

    szovegBeallitasa('#lebego-foglalas-gomb', foglalas.lebegoGomb);
}

function arlistaSzolgaltatasokLetrehozasa(arlista) {
    if (!Array.isArray(arlista?.csoportok)) {
        return [];
    }

    return arlista.csoportok.flatMap(csoport => {
        return (csoport.tetelek || [])
            .filter(tetel => tetel.foglalasban !== false)
            .map(tetel => ({
                nev: `${csoport.cim} - ${tetel.nev}`,
                ido: idoMegjelenitese(tetel)
            }));
    });
}

function idoMegjelenitese(tetel) {
    const { ora, perc, vanIdo } = idoSzamok(tetel);

    if (!vanIdo) {
        return '';
    }

    const reszek = [];

    if (ora > 0) {
        reszek.push(`${ora} óra`);
    }

    if (perc > 0) {
        reszek.push(`${perc} perc`);
    }

    return reszek.join(' ');
}

function idoSzamok(tetel) {
    if (tetel.idoOra !== undefined || tetel.idoPerc !== undefined) {
        const oraUres = tetel.idoOra === '' || tetel.idoOra === null || tetel.idoOra === undefined;
        const percUres = tetel.idoPerc === '' || tetel.idoPerc === null || tetel.idoPerc === undefined;
        return {
            ora: pozitivEgesz(tetel.idoOra),
            perc: pozitivEgesz(tetel.idoPerc),
            vanIdo: !oraUres || !percUres
        };
    }

    if (!tetel.ido || !tetel.ido.trim()) {
        return { ora: 0, perc: 0, vanIdo: false };
    }

    return {
        ora: pozitivEgesz((tetel.ido.match(/(\d+)\s*óra/i) || [])[1]),
        perc: pozitivEgesz((tetel.ido.match(/(\d+)\s*perc/i) || [])[1]),
        vanIdo: true
    };
}

function pozitivEgesz(ertek) {
    const szam = Number.parseInt(ertek, 10);
    return Number.isFinite(szam) && szam > 0 ? szam : 0;
}

function foglalasiSzolgaltatasokRenderelese(szolgaltatasok) {
    const select = document.getElementById('foglalas-szolgatatas');

    if (!select || !Array.isArray(szolgaltatasok)) {
        return;
    }

    select.innerHTML = '';

    const alap = document.createElement('option');
    alap.value = '';
    alap.disabled = true;
    alap.selected = true;
    alap.textContent = 'Válassz szolgáltatást...';
    select.appendChild(alap);

    szolgaltatasok.forEach(szolgaltatas => {
        const option = document.createElement('option');
        const ido = szolgaltatas.ido ? ` - ${szolgaltatas.ido}` : '';
        option.value = `${szolgaltatas.nev}${ido}`;
        option.textContent = `${szolgaltatas.nev}${ido}`;
        select.appendChild(option);
    });
}

async function onlineArlistaBetoltese() {
    const panel = document.querySelector('.arlista-oldal .arlista-panel');
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!panel || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return;
    }

    try {
        const kliens = supabaseLib.createClient(config.url, config.publishableKey);
        const { data, error } = await kliens
            .from('services')
            .select('name,price_text,duration_minutes,active,sort_order')
            .eq('active', true)
            .order('sort_order', { ascending: true });

        if (error || !Array.isArray(data) || data.length === 0) {
            return;
        }

        arlistaSzolgaltatasokRenderelese(data);
    } catch (_error) {
        // Ha a Supabase nem elerheto, a statikus arlista marad lathato.
    }
}

function arlistaSzolgaltatasokRenderelese(szolgaltatasok) {
    const panel = document.querySelector('.arlista-oldal .arlista-panel');

    if (!panel) {
        return;
    }

    const csoportok = new Map();

    szolgaltatasok.forEach(szolgaltatas => {
        const { csoport, nev } = arlistaNevBontasa(szolgaltatas.name || '');

        if (!csoportok.has(csoport)) {
            csoportok.set(csoport, []);
        }

        csoportok.get(csoport).push({
            nev,
            ar: szolgaltatas.price_text || '',
            ido: szolgaltatas.duration_minutes > 0 ? idotartamSzoveg(szolgaltatas.duration_minutes) : ''
        });
    });

    panel.innerHTML = '';

    const felsoCsoportNevek = Array.from(csoportok.keys()).slice(0, 2);
    const alsoCsoportNevek = Array.from(csoportok.keys()).slice(2);

    if (felsoCsoportNevek.length) {
        const ketOszlop = document.createElement('div');
        ketOszlop.className = 'arlista-ket-oszlop';
        felsoCsoportNevek.forEach(csoportNev => {
            ketOszlop.appendChild(onlineArlistaCsoportLetrehozasa(csoportNev, csoportok.get(csoportNev)));
        });
        panel.appendChild(ketOszlop);
    }

    alsoCsoportNevek.forEach(csoportNev => {
        panel.appendChild(onlineArlistaCsoportLetrehozasa(csoportNev, csoportok.get(csoportNev)));
    });
}

function arlistaNevBontasa(teljesNev) {
    const reszek = teljesNev.split(' - ');

    if (reszek.length < 2) {
        return { csoport: 'Szolgáltatások', nev: teljesNev };
    }

    return {
        csoport: reszek[0],
        nev: reszek.slice(1).join(' - ')
    };
}

function onlineArlistaCsoportLetrehozasa(cim, tetelek) {
    const doboz = document.createElement('div');
    doboz.className = 'arlista-csoport';

    const cimsor = document.createElement('h3');
    cimsor.textContent = cim;
    doboz.appendChild(cimsor);

    tetelek.forEach(tetel => {
        const sor = document.createElement('div');
        sor.className = 'arlista-sor';

        const nev = document.createElement('span');
        nev.textContent = tetel.nev;

        const reszlet = document.createElement('strong');
        const ar = document.createElement('span');
        ar.className = 'arlista-ar';
        ar.textContent = tetel.ar;
        reszlet.appendChild(ar);

        if (tetel.ido) {
            const ido = document.createElement('span');
            ido.className = 'arlista-ido';
            ido.textContent = tetel.ido;
            reszlet.appendChild(ido);
        }

        sor.append(nev, reszlet);
        doboz.appendChild(sor);
    });

    return doboz;
}

function idotartamSzoveg(percek) {
    const osszesPerc = Number(percek) || 0;
    const ora = Math.floor(osszesPerc / 60);
    const perc = osszesPerc % 60;
    const reszek = [];

    if (ora > 0) {
        reszek.push(`${ora} óra`);
    }

    if (perc > 0) {
        reszek.push(`${perc} perc`);
    }

    return reszek.join(' ');
}

function lablecAdatokAlkalmazasa(adatok) {
    const kapcsolat = adatok.kapcsolat;
    const marka = adatok.marka;

    if (!kapcsolat && !marka) {
        return;
    }

    szovegBeallitasa('.footer-logo', marka?.nev);
    szovegBeallitasa('.footer-brand p', marka?.rovidLeiras);
    szovegBeallitasa('.footer-kapcsolat h3', kapcsolat?.cimke);
    szovegBeallitasa('.footer-jogi-link', adatok.lablec?.jogiLink);
    szovegBeallitasa('.footer-jogok', adatok.lablec?.jogok);

    const cimLink = document.querySelector('[data-footer-address]');
    const telefonLink = document.querySelector('[data-footer-phone]');
    const emailLink = document.querySelector('[data-footer-email]');
    const instagramLink = document.querySelector('.social-gomb[href*="instagram"]');
    const facebookLink = document.querySelector('.social-gomb[href*="facebook"]');
    const messengerPopup = document.querySelector('.popup-gomb[href*="m.me"]');
    const instagramPopup = document.querySelector('.popup-gomb[href*="ig.me"]');

    if (cimLink && kapcsolat?.cim) {
        cimLink.textContent = kapcsolat.cim;
        cimLink.href = kapcsolat.terkepUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kapcsolat.cim)}`;
        cimLink.hidden = false;
        cimLink.style.display = '';
    }

    if (telefonLink && kapcsolat?.telefon) {
        const telefonLathato = kapcsolat.telefonLathato !== false;
        telefonLink.textContent = kapcsolat.telefon;
        telefonLink.href = `tel:${kapcsolat.telefonLink || kapcsolat.telefon.replace(/\s/g, '')}`;
        telefonLink.hidden = !telefonLathato;
        telefonLink.style.display = telefonLathato ? '' : 'none';
    }

    if (emailLink && kapcsolat?.email) {
        emailLink.textContent = kapcsolat.email;
        emailLink.href = `mailto:${kapcsolat.email}`;
        emailLink.hidden = false;
        emailLink.style.display = '';
    }

    if (instagramLink && kapcsolat?.instagram) {
        instagramLink.href = kapcsolat.instagram;
    }

    if (facebookLink && kapcsolat?.facebook) {
        facebookLink.href = kapcsolat.facebook;
    }

    if (messengerPopup && kapcsolat?.messenger) {
        messengerPopup.href = kapcsolat.messenger;
    }

    if (instagramPopup && kapcsolat?.instagramUzenet) {
        instagramPopup.href = kapcsolat.instagramUzenet;
    }
}

async function onlineTelefonLathatosagAlkalmazasa() {
    const telefonLink = document.querySelector('[data-footer-phone]');
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!telefonLink || !config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return;
    }

    try {
        const kliens = supabaseLib.createClient(config.url, config.publishableKey);
        const { data, error } = await kliens
            .from('site_settings')
            .select('value')
            .eq('key', 'telefon_lathato')
            .maybeSingle();

        if (error || !data) {
            return;
        }

        const lathato = data.value?.visible !== false;
        telefonLink.hidden = !lathato;
        telefonLink.style.display = lathato ? '' : 'none';
    } catch (_error) {
        // Ha az online beallitas meg nincs elesitve, a JSON szerinti alapertek marad.
    }
}

document.addEventListener('click', function (event) {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');

    if (!menu || !hamburger) {
        return;
    }

    if (menu.classList.contains('open') && !menu.contains(event.target) && !hamburger.contains(event.target)) {
        menuBezarasa();
    }
});

function csakSzamokatEnged(input) {
    let szamok = input.value.replace(/[^0-9]/g, '');

    if (szamok.startsWith('0036')) {
        szamok = szamok.substring(4);
    } else if (szamok.startsWith('36')) {
        szamok = szamok.substring(2);
    } else if (szamok.startsWith('06')) {
        szamok = szamok.substring(2);
    }

    while (szamok.startsWith('0')) {
        szamok = szamok.substring(1);
    }

    input.value = szamok.substring(0, 9);
}

function idopontokGeneralasa() {
    const idoValaszto = document.getElementById('foglalas-ido');

    if (!idoValaszto || document.body.dataset.bookingMode === 'supabase') {
        return;
    }

    const kezdoOra = 8;
    const vegOra = 18;

    for (let ora = kezdoOra; ora <= vegOra; ora++) {
        for (let perc = 0; perc < 60; perc += 15) {
            if (ora === vegOra && perc > 0) break;

            const pStr = String(perc).padStart(2, '0');
            const oStr = String(ora).padStart(2, '0');
            const idopont = `${oStr}:${pStr}`;

            const option = document.createElement('option');
            option.value = idopont;
            option.textContent = idopont;
            idoValaszto.appendChild(option);
        }
    }
}

function datumMinimumBeallitasa() {
    const datumMezo = document.getElementById('foglalas-datum');

    if (!datumMezo) {
        return;
    }

    datumMezo.min = maiDatum();
}

function maiDatum() {
    const ma = new Date();
    const ev = ma.getFullYear();
    const honap = String(ma.getMonth() + 1).padStart(2, '0');
    const nap = String(ma.getDate()).padStart(2, '0');

    return `${ev}-${honap}-${nap}`;
}

function foglalasiUrlapBekotese() {
    const telefonMezo = document.getElementById('foglalas-tel');
    const kuldesGomb = document.getElementById('foglalas-kuldes');
    const popupBezarasGomb = document.getElementById('popup-bezaras');
    const supabaseFoglalas = document.body.dataset.bookingMode === 'supabase';

    if (telefonMezo) {
        telefonMezo.addEventListener('input', () => csakSzamokatEnged(telefonMezo));
    }

    if (kuldesGomb && !supabaseFoglalas) {
        kuldesGomb.addEventListener('click', foglalasInditasa);
    }

    if (popupBezarasGomb) {
        popupBezarasGomb.addEventListener('click', popupBezarasa);
    }
}

function lebegoFoglalasLetrehozasa() {
    if (foglalasOldal() || adminOldal() || document.getElementById('lebego-foglalas-gomb')) {
        return;
    }

    const gomb = document.createElement('a');
    gomb.href = '/foglalas/';
    gomb.id = 'lebego-foglalas-gomb';
    gomb.className = 'lebego-foglalas-gomb';
    gomb.textContent = 'Időpontfoglalás';
    document.body.appendChild(gomb);
}

function foglalasOldal() {
    const utvonal = window.location.pathname.toLowerCase();
    return utvonal === '/foglalas/' || utvonal.endsWith('/foglalas.html') || utvonal.endsWith('/foglalas/index.html');
}

function adminOldal() {
    const utvonal = window.location.pathname.toLowerCase();
    return utvonal === '/admin/' || utvonal.endsWith('/admin.html') || utvonal.endsWith('/admin/index.html');
}

function galeriaBekotese() {
    const galeriaGombok = Array.from(document.querySelectorAll('.galeria-kep-gomb'));
    const lightbox = document.getElementById('galeria-lightbox');

    if (galeriaGombok.length === 0 || !lightbox) {
        return;
    }

    galeriaKepek = galeriaGombok.map(gomb => ({
        src: gomb.dataset.src,
        alt: gomb.dataset.alt || ''
    }));

    galeriaGombok.forEach((gomb, index) => {
        gomb.addEventListener('click', () => galeriaMegnyitasa(index));
    });

    lightbox.querySelector('.galeria-lightbox-bezar').addEventListener('click', galeriaBezarasa);
    lightbox.querySelector('.galeria-lightbox-elozo').addEventListener('click', () => galeriaLepes(-1));
    lightbox.querySelector('.galeria-lightbox-kovetkezo').addEventListener('click', () => galeriaLepes(1));

    lightbox.addEventListener('click', event => {
        if (event.target === lightbox) {
            galeriaBezarasa();
        }
    });

    if (window.PointerEvent) {
        lightbox.addEventListener('pointerdown', galeriaPointerHuzasKezdete);
        lightbox.addEventListener('pointerup', galeriaPointerHuzasVege);
        lightbox.addEventListener('pointercancel', galeriaPointerHuzasMegszakitas);
    } else {
        lightbox.addEventListener('touchstart', galeriaHuzasKezdete, { passive: true });
        lightbox.addEventListener('touchend', galeriaHuzasVege);
    }

    document.addEventListener('keydown', event => {
        if (!lightbox.classList.contains('nyitva')) {
            return;
        }

        if (event.key === 'Escape') galeriaBezarasa();
        if (event.key === 'ArrowLeft') galeriaLepes(-1);
        if (event.key === 'ArrowRight') galeriaLepes(1);
    });
}

function galeriaMegnyitasa(index) {
    galeriaAktualisIndex = index;
    galeriaKepFrissitese();

    const lightbox = document.getElementById('galeria-lightbox');
    lightbox.classList.add('nyitva');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function galeriaBezarasa() {
    const lightbox = document.getElementById('galeria-lightbox');

    if (!lightbox) {
        return;
    }

    lightbox.classList.remove('nyitva');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function galeriaLepes(irany) {
    galeriaAktualisIndex = (galeriaAktualisIndex + irany + galeriaKepek.length) % galeriaKepek.length;
    galeriaKepFrissitese();
}

function galeriaHuzasKezdete(event) {
    const erintes = event.changedTouches[0];
    galeriaHuzasKezdoX = erintes.clientX;
    galeriaHuzasKezdoY = erintes.clientY;
}

function galeriaHuzasVege(event) {
    const erintes = event.changedTouches[0];
    galeriaHuzasEldontese(erintes.clientX, erintes.clientY);
}

function galeriaPointerHuzasKezdete(event) {
    if (event.button !== 0 || event.target.closest('button')) {
        return;
    }

    galeriaHuzasAktiv = true;
    galeriaHuzasKezdoX = event.clientX;
    galeriaHuzasKezdoY = event.clientY;
}

function galeriaPointerHuzasVege(event) {
    if (!galeriaHuzasAktiv) {
        return;
    }

    galeriaHuzasAktiv = false;
    galeriaHuzasEldontese(event.clientX, event.clientY);
}

function galeriaPointerHuzasMegszakitas() {
    galeriaHuzasAktiv = false;
}

function galeriaHuzasEldontese(vegX, vegY) {
    const lightbox = document.getElementById('galeria-lightbox');

    if (!lightbox || !lightbox.classList.contains('nyitva')) {
        return;
    }

    const deltaX = vegX - galeriaHuzasKezdoX;
    const deltaY = vegY - galeriaHuzasKezdoY;
    const elegHosszuHuzas = Math.abs(deltaX) > 55;
    const inkabbVizszintes = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (!elegHosszuHuzas || !inkabbVizszintes) {
        return;
    }

    galeriaLepes(deltaX < 0 ? 1 : -1);
}

function galeriaKepFrissitese() {
    const lightboxKep = document.querySelector('#galeria-lightbox img');
    const kep = galeriaKepek[galeriaAktualisIndex];

    if (!lightboxKep || !kep) {
        return;
    }

    lightboxKep.src = kep.src;
    lightboxKep.alt = kep.alt;
}

function lebegoFoglalasFigyeles() {
    const lebegoGomb = document.getElementById('lebego-foglalas-gomb');
    const foglalasGombok = Array.from(document.querySelectorAll('a.gomb[href*="foglalas"]'))
        .filter(gomb => gomb.id !== 'lebego-foglalas-gomb');
    const footer = document.querySelector('.site-footer');
    const figyeltElemek = footer ? [...foglalasGombok, footer] : foglalasGombok;

    if (!lebegoGomb || figyeltElemek.length === 0) {
        return;
    }

    const lathatoElemek = new Set();
    const lathatosagFigyelo = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                lathatoElemek.add(entry.target);
            } else {
                lathatoElemek.delete(entry.target);
            }
        });

        lebegoGomb.classList.toggle('rejtve', lathatoElemek.size > 0);
    }, {
        rootMargin: '0px 0px 96px 0px',
        threshold: 0.01
    });

    figyeltElemek.forEach(elem => lathatosagFigyelo.observe(elem));
}

function foglalasInditasa() {
    const nev = document.getElementById('foglalas-nev').value.trim();
    const telReszlet = document.getElementById('foglalas-tel').value.trim();
    const szolgatatas = document.getElementById('foglalas-szolgatatas').value;
    const datum = document.getElementById('foglalas-datum').value;
    const ido = document.getElementById('foglalas-ido').value;
    const komment = document.getElementById('foglalas-komment').value.trim();

    if (!nev || !telReszlet || !szolgatatas || !datum || !ido) {
        alert('Kérlek tölts ki minden kötelező mezőt a folytatáshoz!');
        return;
    }

    if (telReszlet.length !== 9) {
        alert('Kérlek 9 számjegyű magyar mobilszámot adj meg, országkód nélkül. Példa: 301234567');
        return;
    }

    if (datum < maiDatum()) {
        alert('Múltbeli dátumra nem lehet időpontot kérni.');
        return;
    }

    const teljesTelefon = `+36 ${telReszlet}`;
    const uzenet = `Szia! Szeretnék időpontot foglalni.\n\nNév: ${nev}\nTelefon: ${teljesTelefon}\nSzolgáltatás: ${szolgatatas}\nDátum: ${datum} - ${ido} óra\nMegjegyzés: ${komment ? komment : '-'}\n\nKérlek jelezz vissza, hogy megfelel-e.\nKöszönöm!`;

    uzenetMasolasa(uzenet).then(sikeresMasolas => {
        popupMegnyitasa(sikeresMasolas, uzenet);
    });
}

function uzenetMasolasa(uzenet) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(uzenet)
            .then(() => true)
            .catch(() => tartalekMasolas(uzenet));
    }

    return Promise.resolve(tartalekMasolas(uzenet));
}

function tartalekMasolas(uzenet) {
    const textarea = document.createElement('textarea');
    textarea.value = uzenet;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    let sikeres = false;

    try {
        sikeres = document.execCommand('copy');
    } catch (err) {
        sikeres = false;
    }

    document.body.removeChild(textarea);
    return sikeres;
}

function popupMegnyitasa(sikeresMasolas, uzenet) {
    const popup = document.getElementById('sikeres-popup');
    const popupCim = popup.querySelector('.popup-cim');
    const popupSzoveg = popup.querySelector('.popup-szoveg');
    const popupUzenet = document.getElementById('popup-uzenet');
    const popupAdatok = window.lumiAdatok?.foglalas?.popup || {};

    if (sikeresMasolas) {
        popupCim.textContent = popupAdatok.sikeresCim || 'Adatok másolva!';
        popupSzoveg.innerHTML = sortoresesSzoveg(popupAdatok.sikeresSzoveg || 'A foglalásod szövegét vágólapra másoltuk. Válaszd ki, hol szeretnéd elküldeni nekem, majd nyomj a Beillesztés gombra a chaten!');
        popupUzenet.classList.remove('lathato');
        popupUzenet.value = '';
    } else {
        popupCim.textContent = popupAdatok.tartalekCim || 'Adatok előkészítve';
        popupSzoveg.innerHTML = sortoresesSzoveg(popupAdatok.tartalekSzoveg || 'A böngésződ most nem engedte az automatikus másolást. Jelöld ki az alábbi szöveget, másold ki, majd küldd el üzenetben.');
        popupUzenet.value = uzenet;
        popupUzenet.classList.add('lathato');
        setTimeout(() => popupUzenet.select(), 100);
    }

    popup.style.display = 'flex';
}

function popupBezarasa() {
    document.getElementById('sikeres-popup').style.display = 'none';
}
