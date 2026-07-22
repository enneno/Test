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

    const hero = String(adatok.fooldal.hero.kep || '');
    if (!hero || hero.includes('/kepek/hatter2.jpg') || hero.includes('/kepek/hero-hullamos.jpg')) {
        adatok.fooldal.hero.kep = alap?.fooldal?.hero?.kep || '/kepek/hero-exact.jpg';
    }

    const alapKepek = alap?.fooldal?.galeriaAtvezeto?.kepek || [];
    const mentettKepek = adatok.fooldal.galeriaAtvezeto.kepek || [];
    adatok.fooldal.galeriaAtvezeto.kepek = Array.from({ length: 5 }, (_item, index) =>
        melyOsszefesules(alapKepek[index] || { src: '', alt: '' }, mentettKepek[index] || {})
    );
    return adatok;
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
    const heroKep = hero?.querySelector('.hero-kep');
    if (hero && fooldal.hero?.kep) {
        const heroKepSrc = fooldal.hero.kep || '/kepek/hero-exact.jpg';

        if (heroKep) {
            heroKep.src = heroKepSrc;
            heroKep.alt = fooldal.hero.kepAlt || 'Lumi Nails nyitókép';
            heroKep.loading = 'eager';
            heroKep.decoding = 'async';
            if ('fetchPriority' in heroKep) heroKep.fetchPriority = 'high';
            hero.style.backgroundImage = 'none';
            hero.removeAttribute('role');
        } else {
            hero.style.backgroundImage = `linear-gradient(90deg, rgba(253, 244, 226, 0.12) 0%, rgba(253, 244, 226, 0.02) 44%, rgba(43, 37, 33, 0.05) 100%), url("${heroKepSrc}")`;
            hero.setAttribute('role', 'img');
        }

        if (fooldal.hero.kepAlt) hero.setAttribute('aria-label', fooldal.hero.kepAlt);
    }

    szovegBeallitasa('.bemutatkozas-szoveg h2', fooldal.bemutatkozas?.cim);
    bekezdesekRenderelese('.bemutatkozas-szoveg', fooldal.bemutatkozas?.bekezdesek);
    kepBeallitasa('.bemutatkozas-kep img', fooldal.bemutatkozas?.kep, fooldal.bemutatkozas?.kepAlt);
    const bemutatkozasKep = document.querySelector('.bemutatkozas-kep img');
    if (bemutatkozasKep) {
        bemutatkozasKep.loading = 'eager';
        bemutatkozasKep.decoding = 'async';
    }

    szolgaltatasKartyakRenderelese(fooldal.szolgaltatasok);
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
    const racs = szekcio?.querySelector('.szolgaltatas-lista');

    if (!szekcio || !racs || !Array.isArray(szolgaltatasok?.kartyak)) {
        return;
    }

    szovegBeallitasa('h2', szolgaltatasok.cim, szekcio);
    racs.innerHTML = '';

    szolgaltatasok.kartyak.forEach(kartya => {
        const doboz = document.createElement('div');
        doboz.className = 'szolgaltatas-kartya';

        const cim = document.createElement('h3');
        cim.textContent = kartya.cim || '';

        const leiras = document.createElement('p');
        leiras.innerHTML = sortoresesSzoveg(kartya.leiras || '');

        doboz.append(cim, leiras);
        racs.appendChild(doboz);
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
        kepek[index].loading = 'eager';
        kepek[index].decoding = 'async';
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

        if (supabaseFoglalas) {
            supabaseFoglalasSzovegekAlkalmazasa(foglalas);
        } else {
            szovegBeallitasa('h2', foglalas.cim, szekcio);
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
}

function foglalasUtSzovegAlkalmazasa(selector, adatok) {
    if (!adatok) return;
    const kartya = document.querySelector(selector);
    if (!kartya) return;

    szovegBeallitasa('.foglalas-ut-cim', adatok.cim, kartya);
    htmlSzovegBeallitasa('.foglalas-ut-leiras', adatok.leiras, kartya);
    szovegBeallitasa('.foglalas-ut-gomb', adatok.gomb, kartya);
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

        arlistaSzolgaltatasokRenderelese(data.map(szolgaltatasArNormalizalasa));
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
