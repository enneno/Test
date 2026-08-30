function oldalTartalomMegjelenitese() {
    document.body.classList.remove('tartalom-toltes');
    document.dispatchEvent(new CustomEvent(LUMI_TARTALOM_KESZ_ESEMENY));
}

const LUMI_MENU_BEZARVA_ESEMENY = 'lumi:menu-bezarva';
const LUMI_TARTALOM_KESZ_ESEMENY = 'lumi:tartalom-kesz';
const LUMI_FOGLALASI_TARTALOM_KESZ_ESEMENY = 'lumi:foglalasi-tartalom-kesz';
let belsoHorgonyNavigacioBekotve = false;

function menuEsemenyekBekotese() {
    const hamburger = document.querySelector('.hamburger');

    if (hamburger) {
        hamburger.addEventListener('click', menuToggle);
    }

    if (!belsoHorgonyNavigacioBekotve) {
        document.addEventListener('click', navigaciosLinkKattintas);
        kezdetiHorgonyPontositasaBekotese();
        belsoHorgonyNavigacioBekotve = true;
    }
}

function menuToggle() {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');

    if (!menu) {
        return;
    }

    if (menu.classList.contains('open')) {
        menuBezarasa();
        return;
    }

    menu.classList.add('open');

    if (hamburger) {
        hamburger.classList.add('open');
        hamburger.setAttribute('aria-controls', 'mobil-nav');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.setAttribute('aria-label', 'Menü bezárása');
    }

    document.body.classList.add('mobil-menu-nyitva');
}

function menuBezarasa() {
    const menu = document.getElementById('mobil-nav');
    const hamburger = document.querySelector('.hamburger');
    const nyitva = Boolean(menu?.classList.contains('open'));
    const csokkentettMozgas = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const atmenetAktiv = nyitva && !csokkentettMozgas && menuAtmenetAktiv(menu);
    let befejezve = false;

    const befejezes = () => {
        if (befejezve) return;
        befejezve = true;
        menu?.removeEventListener('transitionend', atmenetVege);
        menu?.removeEventListener('transitioncancel', atmenetVege);
        document.dispatchEvent(new CustomEvent(LUMI_MENU_BEZARVA_ESEMENY));
    };

    const atmenetVege = event => {
        if (event.target === menu) {
            befejezes();
        }
    };

    if (atmenetAktiv) {
        menu.addEventListener('transitionend', atmenetVege);
        menu.addEventListener('transitioncancel', atmenetVege);
    }

    if (menu) {
        menu.classList.remove('open');
    }

    if (hamburger) {
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Menü megnyitása');
    }

    document.body.classList.remove('mobil-menu-nyitva');

    if (!atmenetAktiv) {
        befejezes();
    }
}

function menuAtmenetAktiv(menu) {
    if (!menu) return false;

    return window.getComputedStyle(menu).transitionDuration
        .split(',')
        .some(ido => Number.parseFloat(ido) > 0);
}

function navigaciosLinkKattintas(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }

    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') {
        return;
    }

    const horgony = azonosOldaliHorgony(link);
    const mobilMenuben = Boolean(link.closest('#mobil-nav'));

    if (!horgony) {
        if (mobilMenuben) menuBezarasa();
        return;
    }

    event.preventDefault();
    const menuNyitva = Boolean(document.getElementById('mobil-nav')?.classList.contains('open'));
    const gordites = () => horgonyhozGordites(horgony);

    if (menuNyitva) {
        document.addEventListener(LUMI_MENU_BEZARVA_ESEMENY, gordites, { once: true });
        menuBezarasa();
        return;
    }

    if (mobilMenuben) menuBezarasa();
    gordites();
}

function azonosOldaliHorgony(link) {
    let url;

    try {
        url = new URL(link.href, window.location.href);
    } catch (_error) {
        return null;
    }

    if (url.origin !== window.location.origin
        || !url.hash
        || normalizaltUtvonal(url.pathname) !== normalizaltUtvonal(window.location.pathname)
        || url.search !== window.location.search) {
        return null;
    }

    let azonosito;
    try {
        azonosito = decodeURIComponent(url.hash.slice(1));
    } catch (_error) {
        return null;
    }

    const cel = document.getElementById(azonosito);
    return cel ? { cel, url } : null;
}

function horgonyhozGordites({ cel, url }) {
    const celUrl = `${url.pathname}${url.search}${url.hash}`;
    const jelenlegiUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (celUrl !== jelenlegiUrl) {
        window.history.pushState(null, '', celUrl);
    }

    const csokkentettMozgas = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cel.scrollIntoView({
        behavior: csokkentettMozgas ? 'auto' : 'smooth',
        block: 'start'
    });
    aktivMenuJelolese();
}

function kezdetiHorgonyPontositasaBekotese() {
    if (!window.location.hash) return;

    const keszEsemeny = window.location.hash === '#foglalas-ellenorzes'
        ? LUMI_FOGLALASI_TARTALOM_KESZ_ESEMENY
        : LUMI_TARTALOM_KESZ_ESEMENY;

    document.addEventListener(keszEsemeny, aktualisHorgonyPontositasa, { once: true });
}

function aktualisHorgonyPontositasa() {
    const horgony = azonosOldaliHorgony({ href: window.location.href });
    if (!horgony) return;

    horgony.cel.scrollIntoView({
        behavior: 'auto',
        block: 'start'
    });
    aktivMenuJelolese();
}

function aktivMenuJelolese() {
    const aktualis = normalizaltUtvonal(window.location.pathname);
    const hash = window.location.hash;

    document.querySelectorAll('.site-header nav a, #mobil-nav a').forEach(link => {
        const linkUtvonal = normalizaltUtvonal(new URL(link.href).pathname);
        const azonosUtvonal = linkUtvonal === aktualis;
        const aktiv = link.hash
            ? azonosUtvonal && link.hash === hash
            : azonosUtvonal && !hash;

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
        '/fiokom/index.html': '/fiokom/',
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
        })
        .then(adatok => oldalAdatokNormalizalasa(adatok, alap));
}

async function onlineOldalAdatokBetoltese() {
    const config = window.LUMI_SUPABASE;
    const supabaseLib = window.supabase;

    if (!config?.url || !config?.publishableKey || !supabaseLib?.createClient) {
        return null;
    }

    try {
        const kliens = window.lumiSupabaseClient();
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

function oldalAdatokNormalizalasa(adatok, alap) {
    if (!adatok) return alap;
    adatok.fooldal ||= {};
    adatok.fooldal.hero ||= {};
    adatok.fooldal.galeriaAtvezeto ||= {};
    adatok.fooldal.szolgaltatasok ||= {};
    adatok.galeria ||= {};
    adatok.galeria.elemek ||= [];

    const hero = String(adatok.fooldal.hero.kep || '');
    if (!hero || hero.includes('/kepek/hatter2.jpg') || hero.includes('/kepek/hero-hullamos.jpg')) {
        adatok.fooldal.hero.kep = alap?.fooldal?.hero?.kep || '/kepek/hero-turkiz.jpg';
    }

    const kivalasztottKepek = Array.isArray(adatok.fooldal.galeriaAtvezeto.kivalasztottKepek)
        ? adatok.fooldal.galeriaAtvezeto.kivalasztottKepek
        : [];
    adatok.fooldal.galeriaAtvezeto.kivalasztottKepek = galeriaKivalasztasNormalizalasa(
        adatok.galeria.elemek,
        kivalasztottKepek,
        5
    );

    const nailArt = adatok.szolgaltatasOldalak?.nailArt;
    if (nailArt) {
        const nailArtKivalasztas = Array.isArray(nailArt.kivalasztottKepek)
            ? nailArt.kivalasztottKepek
            : [];
        nailArt.kivalasztottKepek = galeriaKivalasztasNormalizalasa(
            adatok.galeria.elemek,
            nailArtKivalasztas,
            4
        );
    }

    const diszitesKartya = adatok.fooldal.szolgaltatasok.kartyak?.find(kartya =>
        /dísz|nail art/i.test(String(kartya?.cim || ''))
    );
    if (diszitesKartya && /különleges 3D dekorációk/i.test(String(diszitesKartya.leiras || ''))) {
        const alapKartya = alap?.fooldal?.szolgaltatasok?.kartyak?.find(kartya =>
            /dísz|nail art/i.test(String(kartya?.cim || ''))
        );
        diszitesKartya.leiras = alapKartya?.leiras || diszitesKartya.leiras;
        diszitesKartya.linkSzoveg = alapKartya?.linkSzoveg || 'Részletek';
    }
    return adatok;
}

function galeriaKivalasztasNormalizalasa(elemek, kertKulcsok, limit) {
    const kert = new Set(Array.isArray(kertKulcsok) ? kertKulcsok : []);
    return (Array.isArray(elemek) ? elemek : [])
        .filter(elem => elem?.kep && (kert.has(elem.id) || kert.has(elem.kep)))
        .map(elem => elem.id || elem.kep)
        .slice(0, limit);
}

function kapcsolatGyorsLinkekNormalizalasa(adatok) {
    if (!adatok) return;
    const kapcsolat = adatok.kapcsolat || (adatok.kapcsolat = {});

    if (!kapcsolat.telefon) kapcsolat.telefon = '+36 20 563 6494';
    if (!kapcsolat.telefonLink) kapcsolat.telefonLink = '+36205636494';
    if (!kapcsolat.email || /@luminails\.hu$/i.test(kapcsolat.email)) kapcsolat.email = 'luminails.xx@gmail.com';
    if (!kapcsolat.smsUzenet) kapcsolat.smsUzenet = 'sms:+36205636494';
    if (!kapcsolat.messenger || kapcsolat.messenger.includes('61576508698202')) {
        kapcsolat.messenger = 'https://m.me/petras.szofi';
    }
}

function oldalAdatokAlkalmazasa(adatok) {
    if (!adatok) {
        return;
    }

    kapcsolatGyorsLinkekNormalizalasa(adatok);
    window.lumiAdatok = adatok;
    fejlecAdatokAlkalmazasa(adatok);
    fooldalAdatokAlkalmazasa(adatok.fooldal, adatok.galeria);
    szolgaltatasOldalAdatokAlkalmazasa(adatok.szolgaltatasOldalak, adatok.galeria);
    arlistaAdatokAlkalmazasa(adatok.arlista);
    galeriaAdatokAlkalmazasa(adatok.galeria);
    foglalasAdatokAlkalmazasa(adatok.foglalas, adatok.arlista);
    lablecAdatokAlkalmazasa(adatok);
    seoAdatokAlkalmazasa(adatok.seo);
}

function fejlecAdatokAlkalmazasa(adatok) {
    const marka = adatok?.marka;
    const navigacio = adatok?.navigacio;
    document.querySelectorAll('.site-header .logo').forEach(link => {
        link.setAttribute('aria-label', `${marka?.nev || 'Lumi Nails'} kezdőlap`);
    });

    const linkek = [
        ['a[href="/"]', navigacio?.kezdolap],
        ['a[href="/#szolgaltatasok"]', navigacio?.szolgaltatasok],
        ['a[href="/arlista/"]', navigacio?.arlista],
        ['a[href="/galeria/"]', navigacio?.galeria],
        ['a[href="/foglalas/"]', navigacio?.foglalas],
        ['a.foglalas-kezelo-nav', navigacio?.foglalasom]
    ];
    ['.site-header .menu-pontok', '#mobil-nav'].forEach(gyokerSelector => {
        const gyoker = document.querySelector(gyokerSelector);
        if (!gyoker) return;
        linkek.forEach(([selector, felirat]) => szovegBeallitasa(selector, felirat, gyoker));
    });
}

function galeriaAdatokAlkalmazasa(galeria) {
    const szekcio = document.querySelector('.galeria-oldal');
    const racs = szekcio?.querySelector('.galeria-racs');
    if (!szekcio || !galeria || !racs) return;

    szovegBeallitasa('.galeria-oldal-fej .szekcio-kicker', galeria.kicker, szekcio);
    szovegBeallitasa('h1', galeria.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', galeria.leiras, szekcio);
    szovegBeallitasa('.galeria-oldal-zaras p', galeria.zaras, szekcio);
    szovegBeallitasa('a.gomb[href*="foglalas"]', galeria.foglalasGomb, szekcio);

    if (!Array.isArray(galeria.elemek)) return;
    racs.innerHTML = '';
    galeria.elemek.filter(elem => elem?.kep).forEach((elem, index) => {
        const gomb = document.createElement('button');
        gomb.type = 'button';
        gomb.className = `galeria-kep-gomb${elem.magas ? ' magas' : ''}`;
        gomb.dataset.src = elem.kep;
        gomb.dataset.alt = elem.kepAlt || 'Lumi Nails köröm munka';
        const kep = document.createElement('img');
        kep.src = elem.eloKep || elem.kep;
        kep.alt = elem.kepAlt || 'Lumi Nails köröm munka';
        kep.loading = index < 3 ? 'eager' : 'lazy';
        kep.decoding = 'async';
        if (index === 0) kep.fetchPriority = 'high';
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

function fooldalAdatokAlkalmazasa(fooldal, teljesGaleria) {
    if (!fooldal) {
        return;
    }

    vendegertesitoAlkalmazasa(fooldal.ertesito);

    const heroAdatok = fooldal.hero || {};
    szovegBeallitasa('.hero-kicker', heroAdatok.kicker);
    szovegBeallitasa('.hero-content h1', heroAdatok.cim);
    szovegBeallitasa('.hero-content > p', heroAdatok.leiras);
    szovegBeallitasa('.hero-primary', heroAdatok.gombSzoveg);

    const heroElonyok = document.querySelector('.hero-bizalom');
    if (heroElonyok && Array.isArray(heroAdatok.elonyok)) {
        heroElonyok.innerHTML = heroAdatok.elonyok.map(elony => `
            <span><strong>${html(elony?.kiemeles || '')}</strong>${elony?.szoveg ? ` ${html(elony.szoveg)}` : ''}</span>
        `).join('');
    }

    const heroMonogram = document.querySelector('.hero-monogram');
    if (heroMonogram && heroAdatok.monogram !== undefined) {
        heroMonogram.innerHTML = Array.from(String(heroAdatok.monogram || ''))
            .map(betu => `<span>${html(betu)}</span>`)
            .join('');
    }

    szovegBeallitasa('.hero-visual-cimke > span', heroAdatok.galeriaCimke);
    const heroGaleriaLink = document.querySelector('.hero-visual-cimke > a');
    if (heroGaleriaLink && heroAdatok.galeriaLink !== undefined) {
        heroGaleriaLink.innerHTML = `${html(heroAdatok.galeriaLink)} <span aria-hidden="true">→</span>`;
    }

    const hero = document.getElementById('hero');
    const heroKep = hero?.querySelector('.hero-kep');
    if (hero && heroAdatok.kep) {
        const heroKepSrc = heroAdatok.kep === '/kepek/hero-exact.jpg'
            ? '/kepek/hero-turkiz.jpg' : (heroAdatok.kep || '/kepek/hero-turkiz.jpg');

        if (heroKep) {
            heroKep.src = heroKepSrc;
            heroKep.alt = heroAdatok.kepAlt || 'Lumi Nails nyitókép';
            heroKep.loading = 'eager';
            heroKep.decoding = 'async';
            if ('fetchPriority' in heroKep) heroKep.fetchPriority = 'high';
            hero.style.backgroundImage = 'none';
            hero.removeAttribute('role');
        } else {
            hero.style.backgroundImage = `linear-gradient(90deg, rgba(253, 244, 226, 0.12) 0%, rgba(253, 244, 226, 0.02) 44%, rgba(43, 37, 33, 0.05) 100%), url("${heroKepSrc}")`;
            hero.setAttribute('role', 'img');
        }

        if (heroAdatok.kepAlt) hero.setAttribute('aria-label', heroAdatok.kepAlt);
    }

    const bemutatkozas = fooldal.bemutatkozas || {};
    szovegBeallitasa('.bemutatkozas-szoveg > .szekcio-kicker', bemutatkozas.kicker);
    szovegBeallitasa('.bemutatkozas-szoveg h2', bemutatkozas.cim);
    bekezdesekRenderelese('.bemutatkozas-szoveg', bemutatkozas.bekezdesek);
    const bemutatkozasLink = document.querySelector('.bemutatkozas-szoveg > .szoveges-link');
    if (bemutatkozasLink && bemutatkozas.linkSzoveg !== undefined) {
        bemutatkozasLink.innerHTML = `${html(bemutatkozas.linkSzoveg)} <span aria-hidden="true">→</span>`;
    }
    szovegBeallitasa('.bemutatkozas-kep-jelveny > span', bemutatkozas.jelvenyCim);
    szovegBeallitasa('.bemutatkozas-kep-jelveny > small', bemutatkozas.jelvenyAlcim);
    kepBeallitasa('.bemutatkozas-kep img', bemutatkozas.kep, bemutatkozas.kepAlt);
    const bemutatkozasKep = document.querySelector('.bemutatkozas-kep img');
    if (bemutatkozasKep) {
        bemutatkozasKep.loading = 'eager';
        bemutatkozasKep.decoding = 'async';
    }

    szolgaltatasKartyakRenderelese(fooldal.szolgaltatasok);
    galeriaAtvezetoAlkalmazasa(fooldal.galeriaAtvezeto, teljesGaleria);
    foglalasAtvezetoAlkalmazasa(fooldal.foglalasAtvezeto);
}

function vendegertesitoAlkalmazasa(ertesito) {
    const sav = document.getElementById('vendegertesito');
    if (!sav) return;

    const szoveg = String(ertesito?.szoveg || '').trim();
    const aktiv = ertesito?.aktiv === true && Boolean(szoveg);
    sav.hidden = !aktiv;
    if (!aktiv) return;

    const cimke = String(ertesito?.cimke || '').trim() || 'Aktuális információ';
    szovegBeallitasa('.vendegertesito-cimke', cimke, sav);
    szovegBeallitasa('.vendegertesito-szoveg', szoveg, sav);
    sav.setAttribute('aria-label', cimke);
}

function bekezdesekRenderelese(selector, bekezdesek) {
    const kontener = document.querySelector(selector);

    if (!kontener || !Array.isArray(bekezdesek)) {
        return;
    }

    kontener.querySelectorAll(':scope > p').forEach(p => p.remove());
    const link = kontener.querySelector(':scope > .szoveges-link');
    const fragment = document.createDocumentFragment();

    bekezdesek.forEach(szoveg => {
        const p = document.createElement('p');
        p.textContent = szoveg;
        fragment.appendChild(p);
    });

    kontener.insertBefore(fragment, link || null);
}

function kepBeallitasa(selector, src, alt) {
    const kep = document.querySelector(selector);

    if (!kep) {
        return;
    }

    if (src) kep.src = src;
    if (alt) kep.alt = alt;
}

function szolgaltatasOldalAdatokAlkalmazasa(oldalak, galeria) {
    const kulcs = document.body?.dataset.szolgaltatasOldal;
    const oldal = kulcs ? oldalak?.[kulcs] : null;
    const gyoker = document.querySelector('.seo-szolgaltatas-oldal');
    if (!oldal || !gyoker) return;

    if (oldal.seoCim) document.title = oldal.seoCim;
    const leiras = document.querySelector('meta[name="description"]');
    if (leiras && oldal.seoLeiras) leiras.content = oldal.seoLeiras;
    document.querySelectorAll('meta[property="og:title"]').forEach(meta => {
        if (oldal.seoCim) meta.content = oldal.seoCim;
    });
    document.querySelectorAll('meta[property="og:description"]').forEach(meta => {
        if (oldal.seoLeiras) meta.content = oldal.seoLeiras;
    });

    szovegBeallitasa('.seo-szolgaltatas-hero .szekcio-kicker', oldal.kicker, gyoker);
    szovegBeallitasa('.seo-szolgaltatas-hero h1', oldal.cim, gyoker);
    szovegBeallitasa('.seo-szolgaltatas-hero-szoveg > p', oldal.leiras, gyoker);
    kepBeallitasa('.seo-szolgaltatas-hero-kep img', oldal.kep, oldal.kepAlt);

    const bevezeto = gyoker.querySelector('.seo-szolgaltatas-bevezeto');
    if (bevezeto) {
        szovegBeallitasa('.szekcio-kicker', oldal.bevezetoKicker, bevezeto);
        szovegBeallitasa('h2', oldal.bevezetoCim, bevezeto);
        szovegBeallitasa(':scope > p', oldal.bevezeto, bevezeto);
    }

    gyoker.querySelectorAll('.seo-szolgaltatas-szekcio').forEach((szekcio, index) => {
        const adat = oldal.szekciok?.[index];
        if (!adat) return;
        szovegBeallitasa('.szekcio-kicker', adat.kicker, szekcio);
        szovegBeallitasa('h2', adat.cim, szekcio);
        szolgaltatasBekezdesekRenderelese(szekcio.querySelector('.seo-szolgaltatas-szekcio-szoveg'), adat.szoveg);
    });

    const kiemeles = gyoker.querySelector('.seo-szolgaltatas-kiemeles');
    if (kiemeles && oldal.kiemeles) {
        szovegBeallitasa('.szekcio-kicker', oldal.kiemeles.kicker, kiemeles);
        szovegBeallitasa('h2', oldal.kiemeles.cim, kiemeles);
        szovegBeallitasa(':scope > p', oldal.kiemeles.szoveg, kiemeles);
    }

    const gyikLista = gyoker.querySelector('.seo-gyik-lista');
    const gyik = gyoker.querySelector('.seo-gyik');
    if (gyik) {
        szovegBeallitasa('.seo-gyik-fej .szekcio-kicker', oldal.gyikKicker, gyik);
        szovegBeallitasa('.seo-gyik-fej h2', oldal.gyikCim, gyik);
    }
    if (gyikLista && Array.isArray(oldal.gyik)) {
        gyikLista.innerHTML = oldal.gyik.map(tetel => `
            <article>
                <h3>${html(tetel?.kerdes || '')}</h3>
                <p>${html(tetel?.valasz || '')}</p>
            </article>
        `).join('');
    }

    const kepSzekcio = gyoker.querySelector('.seo-szolgaltatas-kepek');
    const kepRacs = kepSzekcio?.querySelector('.seo-szolgaltatas-kepracs');
    const kepek = szolgaltatasOldalGaleriaKepei(oldal, galeria);
    if (kepSzekcio) kepSzekcio.hidden = !kepek.length;
    if (kepRacs && kepek.length) {
        szovegBeallitasa('.seo-szolgaltatas-kepek-fej .szekcio-kicker', oldal.kepekKicker, kepSzekcio);
        szovegBeallitasa('.seo-szolgaltatas-kepek-fej h2', oldal.kepekCim, kepSzekcio);
        kepRacs.innerHTML = kepek.map(kep => `
            <figure><img src="${attr(kep.kep)}" alt="${attr(kep.kepAlt || oldal.cim || 'Lumi Nails köröm munka')}" loading="lazy" decoding="async"></figure>
        `).join('');
    }

    const zaras = gyoker.querySelector('.seo-szolgaltatas-zaras');
    if (zaras && oldal.zaras) {
        szovegBeallitasa('.szekcio-kicker', oldal.zaras.kicker, zaras);
        szovegBeallitasa('h2', oldal.zaras.cim, zaras);
        szovegBeallitasa('p', oldal.zaras.szoveg, zaras);
        szovegBeallitasa('.seo-szolgaltatas-zaras-akciok .gomb', oldal.zaras.foglalasGomb, zaras);
        const masodlagosGomb = zaras.querySelector('.seo-szolgaltatas-zaras-akciok .szoveges-link');
        if (masodlagosGomb && oldal.zaras.masodlagosGomb !== undefined) {
            masodlagosGomb.innerHTML = `${html(oldal.zaras.masodlagosGomb)} <span aria-hidden="true">→</span>`;
        }
    }
}

function szolgaltatasOldalGaleriaKepei(oldal, galeria) {
    const galeriaElemek = Array.isArray(galeria?.elemek)
        ? galeria.elemek.filter(elem => elem?.kep)
        : [];
    const kivalasztottKulcsok = Array.isArray(oldal?.kivalasztottKepek)
        ? oldal.kivalasztottKepek
        : [];
    const kivalasztottKepek = kivalasztottKulcsok
        .map(kulcs => galeriaElemek.find(elem => (elem.id || elem.kep) === kulcs))
        .filter(Boolean)
        .slice(0, 4)
        .map(elem => ({ kep: elem.kep, kepAlt: elem.kepAlt }));

    if (kivalasztottKepek.length) return kivalasztottKepek;
    return Array.isArray(oldal?.kepek) ? oldal.kepek.filter(kep => kep?.kep).slice(0, 4) : [];
}

function szolgaltatasBekezdesekRenderelese(kontener, szoveg) {
    if (!kontener || szoveg === undefined || szoveg === null) return;
    kontener.querySelectorAll(':scope > p').forEach(bekezdes => bekezdes.remove());
    String(szoveg).split(/\n\s*\n/).filter(Boolean).forEach(resz => {
        const bekezdes = document.createElement('p');
        bekezdes.textContent = resz.trim();
        kontener.appendChild(bekezdes);
    });
}

function szolgaltatasKartyakRenderelese(szolgaltatasok) {
    const szekcio = document.getElementById('szolgaltatasok');
    const racs = szekcio?.querySelector('.szolgaltatas-lista');

    if (!szekcio || !szolgaltatasok) {
        return;
    }

    szovegBeallitasa('.szekcio-fej .szekcio-kicker', szolgaltatasok.kicker, szekcio);
    szovegBeallitasa('.szekcio-fej h2', szolgaltatasok.cim, szekcio);
    szovegBeallitasa('.szolgaltatas-bevezeto > p', szolgaltatasok.leiras, szekcio);

    if (!racs || !Array.isArray(szolgaltatasok.kartyak)) {
        return;
    }

    racs.innerHTML = '';
    const megjelenesek = [
        { valtozat: 'epites', tipus: 'Építés & karbantartás', minta: /epit|tolt/ },
        { valtozat: 'diszites', tipus: 'Egyedi részletek', minta: /diszit|nail art/ },
        { valtozat: 'gel-lakk', tipus: 'Tartós szín', minta: /gel lakk/ },
        { valtozat: 'manikur', tipus: 'Ápolás & eltávolítás', minta: /manikur|apolas|eltavolit/ }
    ];


    szolgaltatasok.kartyak.forEach((kartya, index) => {
        const cimKulcs = String(kartya.cim || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const megjelenes = megjelenesek.find(({ minta }) => minta.test(cimKulcs))
            || megjelenesek[index % megjelenesek.length];
        const doboz = document.createElement('article');
        doboz.className = `szolgaltatas-kartya szolgaltatas-kartya--${megjelenes.valtozat}`;

        const fej = document.createElement('div');
        fej.className = 'szolgaltatas-kartya-fej';


        const tipus = document.createElement('span');
        tipus.className = 'szolgaltatas-tipus';
        tipus.textContent = megjelenes.tipus;

        fej.append(tipus);

        const cim = document.createElement('h3');
        cim.textContent = kartya.cim || '';

        const leiras = document.createElement('p');
        leiras.innerHTML = sortoresesSzoveg(kartya.leiras || '');

        const link = document.createElement('a');
        const galeriaKartya = megjelenes.valtozat === 'diszites';
        const linkSzoveg = kartya.linkSzoveg || (galeriaKartya ? 'Inspirációk' : 'Részletek és árak');
        link.href = szolgaltatasKartyaLinkje(megjelenes.valtozat);
        link.innerHTML = `${html(linkSzoveg)} <span aria-hidden="true">→</span>`;

        doboz.append(fej, cim, leiras, link);
        racs.appendChild(doboz);
    });
}

function szolgaltatasKartyaLinkje(valtozat) {
    if (valtozat === 'epites') return '/mukorom-epites-toltes/';
    if (valtozat === 'diszites') return '/korom-diszites-nail-art-tatabanya/';
    if (valtozat === 'gel-lakk') return '/gel-lakk-tatabanya/';
    if (valtozat === 'manikur') return '/manikur-tatabanya/';
    return '/arlista/';
}

function galeriaAtvezetoAlkalmazasa(galeria, teljesGaleria) {
    const szekcio = document.getElementById('galeria-atvezeto');

    if (!szekcio || !galeria) {
        return;
    }

    szovegBeallitasa('.galeria-showcase-fej .szekcio-kicker', galeria.kicker, szekcio);
    const kiemeltCim = szekcio.querySelector('.galeria-showcase-fej h2');
    if (kiemeltCim) {
        kiemeltCim.innerHTML = `${html(galeria.kiemeltCim || '')}<br><em>${html(galeria.kiemeltAkcentus || '')}</em>`;
    }
    szovegBeallitasa('.galeria-showcase-meta p', galeria.metaLeiras, szekcio);
    szovegBeallitasa('.galeria-atvezeto-szoveg .szekcio-kicker', galeria.belsoKicker, szekcio);
    szovegBeallitasa('.galeria-atvezeto-szoveg h2', galeria.cim, szekcio);
    szovegBeallitasa('.galeria-atvezeto-szoveg .szekcio-leiras', galeria.leiras, szekcio);
    szovegBeallitasa('.galeria-atvezeto-szoveg .gomb', galeria.gombSzoveg, szekcio);

    const kepek = szekcio.querySelectorAll('.galeria-atvezeto-kepek img');
    const galeriaElemek = Array.isArray(teljesGaleria?.elemek)
        ? teljesGaleria.elemek.filter(elem => elem?.kep)
        : [];
    const kivalasztottKulcsok = Array.isArray(galeria.kivalasztottKepek)
        ? galeria.kivalasztottKepek
        : [];
    const kivalasztottElemek = [];

    kivalasztottKulcsok.forEach(kulcs => {
        const elem = galeriaElemek.find(galeriaElem => (galeriaElem.id || galeriaElem.kep) === kulcs);
        if (elem && !kivalasztottElemek.includes(elem)) kivalasztottElemek.push(elem);
    });
    galeriaElemek.forEach(elem => {
        if (kivalasztottElemek.length < 5 && !kivalasztottElemek.includes(elem)) {
            kivalasztottElemek.push(elem);
        }
    });

    const atvezetoKepek = kivalasztottElemek.length
        ? kivalasztottElemek.slice(0, 5).map(elem => ({
            src: elem.eloKep || elem.kep,
            alt: elem.kepAlt || 'Lumi Nails köröm munka'
        }))
        : (galeria.kepek || []);

    atvezetoKepek.forEach((kep, index) => {
        if (!kepek[index]) {
            return;
        }

        if (kep.src) kepek[index].src = kep.src;
        if (kep.alt) kepek[index].alt = kep.alt;
        kepek[index].loading = index < 2 ? 'eager' : 'lazy';
        kepek[index].decoding = 'async';
    });
}

function foglalasAtvezetoAlkalmazasa(foglalasAtvezeto) {
    const szekcio = document.getElementById('kapcsolat');

    if (!szekcio || !foglalasAtvezeto) {
        return;
    }

    szovegBeallitasa('.kapcsolat-tartalom > .szekcio-kicker', foglalasAtvezeto.kicker, szekcio);
    szovegBeallitasa('.kapcsolat-tartalom > h2', foglalasAtvezeto.cim, szekcio);
    szovegBeallitasa('.kapcsolat-tartalom > .szekcio-leiras', foglalasAtvezeto.leiras, szekcio);
    szovegBeallitasa('.kapcsolat-akcio > .gomb', foglalasAtvezeto.gombSzoveg, szekcio);
    szovegBeallitasa('.kapcsolat-akcio > span', foglalasAtvezeto.megjegyzes, szekcio);
}
function arlistaAdatokAlkalmazasa(arlista) {
    const szekcio = document.querySelector('.arlista-oldal');
    const panel = szekcio?.querySelector('.arlista-panel');

    if (!szekcio || !arlista) {
        return;
    }

    szovegBeallitasa('h1', arlista.cim, szekcio);
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

        if (supabaseFoglalas) {
            supabaseFoglalasSzovegekAlkalmazasa(foglalas);
        } else {
            szovegBeallitasa('h1', foglalas.cim, szekcio);
            htmlSzovegBeallitasa('.urlap-leiras', foglalas.leiras, szekcio);
            foglalasiSzolgaltatasokRenderelese(arlistaSzolgaltatasokLetrehozasa(arlista));
            szovegBeallitasa('.popup-gomb[href*="m.me"]', foglalas.popup?.messengerGomb);
            szovegBeallitasa('.popup-gomb[href*="ig.me"]', foglalas.popup?.instagramGomb);
        }

        szovegBeallitasa('#foglalas-kuldes', foglalas.kuldesGomb, szekcio);
        const nevMezo = szekcio.querySelector('#foglalas-nev');
        const telefonMezo = szekcio.querySelector('#foglalas-tel');
        const emailMezo = szekcio.querySelector('#foglalas-email');
        const megjegyzesMezo = szekcio.querySelector('#foglalas-komment');
        if (nevMezo && foglalas.nevPlaceholder) nevMezo.placeholder = foglalas.nevPlaceholder;
        if (telefonMezo && foglalas.telefonPlaceholder) telefonMezo.placeholder = foglalas.telefonPlaceholder;
        if (emailMezo && foglalas.emailPlaceholder) emailMezo.placeholder = foglalas.emailPlaceholder;
        if (megjegyzesMezo && foglalas.megjegyzesPlaceholder) megjegyzesMezo.placeholder = foglalas.megjegyzesPlaceholder;
        szovegBeallitasa('.popup-cim', foglalas.popup?.emailSikeresCim);
        htmlSzovegBeallitasa('.popup-szoveg', foglalas.popup?.emailSikeresSzoveg);
        szovegBeallitasa('#popup-bezaras', foglalas.popup?.bezarasGomb);
        szovegBeallitasa('.popup-gomb[href="/"]', foglalas.popup?.kezdolapGomb);
        szovegBeallitasa('.popup-gomb[href="/galeria/"]', foglalas.popup?.galeriaGomb);
        szovegBeallitasa('#naptar-link', foglalas.popup?.naptarGomb);
        szovegBeallitasa('#foglalas-popup-azonosito > span', foglalas.popup?.azonositoCimke);
        htmlSzovegBeallitasa('#foglalas-popup-azonosito > p', foglalas.popup?.azonositoLeiras);
        szovegBeallitasa('#foglalas-popup-kezeles', foglalas.popup?.kezelesGomb);
    }

    szovegBeallitasa('#lebego-foglalas-gomb', foglalas.lebegoGomb);
}

function supabaseFoglalasSzovegekAlkalmazasa(foglalas) {
    const oldal = foglalas.oldal || {};

    szovegBeallitasa('.foglalas-nyito .foglalas-kicker', oldal.nyitoKicker);
    szovegBeallitasa('#foglalas-cim', oldal.nyitoCim);
    htmlSzovegBeallitasa('.foglalas-nyito .urlap-leiras', oldal.nyitoLeiras);

    foglalasUtSzovegAlkalmazasa('[data-booking-contact="instagram"]', oldal.utak?.instagram);
    foglalasUtSzovegAlkalmazasa('[data-booking-contact="messenger"]', oldal.utak?.messenger);
    foglalasUtSzovegAlkalmazasa('[data-booking-contact="sms"]', oldal.utak?.sms);
    foglalasUtSzovegAlkalmazasa('[data-booking-path="online"]', oldal.utak?.online);

    foglalasUtSzovegAlkalmazasa('[data-booking-path="manage"]', oldal.utak?.kezeles);
    szovegBeallitasa('.foglalas-asszisztens-fej .foglalas-kicker', oldal.onlineKicker);
    szovegBeallitasa('#online-foglalas-cim', oldal.onlineCim);
    htmlSzovegBeallitasa('.foglalas-asszisztens-fej p:not(.foglalas-kicker)', oldal.onlineLeiras);

    (oldal.lepesek || []).forEach((lepes, index) => {
        const selector = `[data-step="${index + 1}"] .foglalas-lepes-fej`;
        szovegBeallitasa(`${selector} h3`, lepes?.cim);
        htmlSzovegBeallitasa(`${selector} p`, lepes?.leiras);
    });

    document.querySelectorAll('.foglalas-stilus-kartya').forEach((kartya, index) => {
        const stilus = oldal.stilusok?.[index];
        if (!stilus) return;
        szovegBeallitasa('span', stilus.cim, kartya);
        htmlSzovegBeallitasa('small', stilus.leiras, kartya);
    });

    htmlSzovegBeallitasa('#foglalas-stilus-tipp', oldal.stilusTipp);
    szovegBeallitasa('.foglalas-kepfeltoltes strong', oldal.kepFeltoltesCim);
    htmlSzovegBeallitasa('.foglalas-kepfeltoltes small', oldal.kepFeltoltesLeiras);
    szovegBeallitasa('#foglalas-osszefoglalo h3', oldal.osszefoglaloCim);
    htmlSzovegBeallitasa('#foglalas-osszefoglalo p', oldal.osszefoglaloUres);

    const kezeles = oldal.kezeles || {};
    szovegBeallitasa('#foglalas-ellenorzes .foglalas-kicker', kezeles.kicker);
    szovegBeallitasa('#foglalas-ellenorzes-cim', kezeles.cim);
    htmlSzovegBeallitasa('.foglalas-kezelo-bevezeto > p:last-child', kezeles.leiras);
    szovegBeallitasa('label[for="foglalas-azonosito"]', kezeles.kodCimke);
    szovegBeallitasa('.foglalas-kezelo-segitseg', kezeles.kodSegitseg);
    szovegBeallitasa('#foglalas-ellenorzes-urlap button[type="submit"]', kezeles.lekeresGomb);
    const megjegyzes = document.getElementById('foglalas-lemondas-megjegyzes');
    const megjegyzesCimke = document.querySelector('#foglalas-lemondas-megjegyzes-blokk > span');
    const kotelezoIndok = megjegyzes?.dataset.requiredWithin24h === 'true';
    if (megjegyzesCimke && kezeles.lemondasMegjegyzesCimke && !kotelezoIndok) {
        megjegyzesCimke.textContent = kezeles.lemondasMegjegyzesCimke;
    }
    if (megjegyzes && kezeles.lemondasMegjegyzesPlaceholder && !kotelezoIndok) {
        megjegyzes.placeholder = kezeles.lemondasMegjegyzesPlaceholder;
    }
    const lemondas = document.getElementById('foglalas-lemondas');
    if (lemondas && kezeles.lemondasGomb) {
        lemondas.dataset.felirat = kezeles.lemondasGomb;
        lemondas.textContent = kezeles.lemondasGomb;
    }
    if (lemondas && kezeles.lemondasLeiras) lemondas.dataset.leiras = kezeles.lemondasLeiras;
}

function foglalasUtSzovegAlkalmazasa(selector, adatok) {
    if (!adatok) return;
    const kartya = document.querySelector(selector);
    if (!kartya) return;

    szovegBeallitasa('.foglalas-ut-cim', adatok.cim, kartya);
    htmlSzovegBeallitasa('.foglalas-ut-leiras', adatok.leiras, kartya);
    szovegBeallitasa('.foglalas-ut-gomb', adatok.gomb, kartya);

    if (kartya.matches('[data-booking-contact="sms"]')) {
        foglalasTelefonEgySorban(kartya.querySelector('.foglalas-ut-leiras'));
    }
}

function foglalasTelefonEgySorban(gyoker) {
    if (!gyoker) return;

    const szovegCsomopontok = [];
    const bejaro = document.createTreeWalker(gyoker, NodeFilter.SHOW_TEXT);

    while (bejaro.nextNode()) {
        szovegCsomopontok.push(bejaro.currentNode);
    }

    for (const csomopont of szovegCsomopontok) {
        const szoveg = csomopont.nodeValue || '';
        const talalat = szoveg.match(/\+36(?:[\s\u00a0-]*\d){8,10}/);
        if (!talalat) continue;

        const telefon = document.createElement('span');
        telefon.className = 'foglalas-telefon-egysor';
        telefon.textContent = talalat[0];

        const reszlet = document.createDocumentFragment();
        reszlet.append(szoveg.slice(0, talalat.index), telefon, szoveg.slice(talalat.index + talalat[0].length));
        csomopont.replaceWith(reszlet);
        break;
    }
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
        const kliens = window.lumiSupabaseClient();
        let { data, error } = await kliens
            .from('services')
            .select('name,price_text,price_amount,price_unit,price_suffix,duration_minutes,active,sort_order')
            .eq('active', true)
            .order('sort_order', { ascending: true });

        if (error && adatbazisOszlopHiany(error, ['price_amount', 'price_unit', 'price_suffix'])) {
            ({ data, error } = await kliens
                .from('services')
                .select('name,price_text,duration_minutes,active,sort_order')
                .eq('active', true)
                .order('sort_order', { ascending: true }));
        }

        if (error || !Array.isArray(data) || data.length === 0) {
            return;
        }

        const szolgaltatasok = data.map(szolgaltatasArNormalizalasa);
        arlistaSzolgaltatasokRenderelese(szolgaltatasok);

        const { data: ervenyesseg } = await kliens
            .from('site_settings')
            .select('value,updated_at')
            .eq('key', 'arlista_ervenyesseg')
            .maybeSingle();

        arlistaErvenyessegMegjelenitese(
            ervenyesseg?.value?.effective_since || ervenyesseg?.updated_at
        );
    } catch (_error) {
        // Ha a Supabase nem elerheto, a statikus arlista marad lathato.
    }
}

function arlistaErvenyessegMegjelenitese(idopont) {
    const elem = document.getElementById('arlista-ervenyesseg');
    if (!elem) return;

    const idoertek = new Date(idopont || '').getTime();

    if (!Number.isFinite(idoertek)) {
        elem.textContent = '';
        elem.hidden = true;
        return;
    }

    const datum = new Date(idoertek);
    const felirat = new Intl.DateTimeFormat('hu-HU', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Europe/Budapest'
    }).format(datum);

    elem.textContent = `Az árlista ${felirat} óta érvényes.`;
    elem.hidden = false;
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
            ar: szolgaltatasArFelirat(szolgaltatas),
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
