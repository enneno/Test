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
    helyiTisztaLinkekBekotese();
    Promise.all([fejlecBetoltese(), lablecBetoltese()])
        .then(() => adatokBetoltese())
        .then(adatok => oldalAdatokAlkalmazasa(adatok));
    idopontokGeneralasa();
    datumMinimumBeallitasa();
    foglalasiUrlapBekotese();
    galeriaBekotese();
    lebegoFoglalasLetrehozasa();
    lebegoFoglalasFigyeles();
});

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

function helyiTisztaLinkekBekotese() {
    if (!['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
        return;
    }

    const helyiFallbackok = {
        '/arlista/': '/arlista.html',
        '/galeria/': '/galeria.html',
        '/foglalas/': '/foglalas.html',
        '/admin/': '/admin.html'
    };

    document.addEventListener('click', event => {
        const link = event.target.closest('a');

        if (!link || link.origin !== window.location.origin) {
            return;
        }

        const fallback = helyiFallbackok[link.pathname];

        if (!fallback) {
            return;
        }

        event.preventDefault();
        window.location.href = fallback + link.search + link.hash;
    });
}

function fejlecBetoltese() {
    return fetch('/header.html')
        .then(response => response.text())
        .then(data => {
            const fejlecHelye = document.getElementById('fejlec-helye');

            if (!fejlecHelye) {
                return;
            }

            fejlecHelye.innerHTML = data;
            menuEsemenyekBekotese();
            aktivMenuJelolese();
        })
        .catch(() => {});
}

function lablecBetoltese() {
    const lablecHelye = document.getElementById('lablec-helye');

    if (!lablecHelye) {
        return Promise.resolve();
    }

    return fetch('/footer.html')
        .then(response => response.text())
        .then(data => {
            lablecHelye.innerHTML = data;
        })
        .catch(() => {});
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
    return fetch('/adatok.json', { cache: 'no-cache' })
        .then(response => response.ok ? response.json() : null)
        .catch(() => null);
}

function oldalAdatokAlkalmazasa(adatok) {
    if (!adatok) {
        return;
    }

    window.lumiAdatok = adatok;
    fooldalAdatokAlkalmazasa(adatok.fooldal);
    arlistaAdatokAlkalmazasa(adatok.arlista);
    foglalasAdatokAlkalmazasa(adatok.foglalas, adatok.arlista);
    lablecAdatokAlkalmazasa(adatok);
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

function fooldalAdatokAlkalmazasa(fooldal) {
    if (!fooldal) {
        return;
    }

    szovegBeallitasa('.hero-kicker', fooldal.hero?.kicker);
    szovegBeallitasa('.hero-content h1', fooldal.hero?.cim);
    szovegBeallitasa('.hero-content p', fooldal.hero?.leiras);

    szovegBeallitasa('.bemutatkozas-szoveg h2', fooldal.bemutatkozas?.cim);
    bekezdesekRenderelese('.bemutatkozas-szoveg', fooldal.bemutatkozas?.bekezdesek);
    kepBeallitasa('.bemutatkozas-kep img', fooldal.bemutatkozas?.kep, fooldal.bemutatkozas?.kepAlt);

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
    const racs = szekcio?.querySelector('.bento-racs');

    if (!szekcio || !racs || !Array.isArray(szolgaltatasok?.kartyak)) {
        return;
    }

    szovegBeallitasa('h2', szolgaltatasok.cim, szekcio);
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

    if (!szekcio || !panel || !Array.isArray(arlista?.csoportok)) {
        return;
    }

    szovegBeallitasa('h2', arlista.cim, szekcio);
    szovegBeallitasa('.szekcio-leiras', arlista.leiras, szekcio);
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

        if (!supabaseFoglalas) {
            szovegBeallitasa('h2', foglalas.cim, szekcio);
            szovegBeallitasa('.urlap-leiras', foglalas.leiras, szekcio);
            szovegBeallitasa('#foglalas-kuldes', foglalas.kuldesGomb, szekcio);
            szovegBeallitasa('.popup-gomb[href*="m.me"]', foglalas.popup?.messengerGomb);
            szovegBeallitasa('.popup-gomb[href*="ig.me"]', foglalas.popup?.instagramGomb);
            szovegBeallitasa('#popup-bezaras', foglalas.popup?.bezarasGomb);
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

function lablecAdatokAlkalmazasa(adatok) {
    const kapcsolat = adatok.kapcsolat;
    const marka = adatok.marka;

    if (!kapcsolat && !marka) {
        return;
    }

    szovegBeallitasa('.footer-logo', marka?.nev);
    szovegBeallitasa('.footer-brand p', marka?.rovidLeiras);
    szovegBeallitasa('.footer-kapcsolat h3', kapcsolat?.cimke);

    const cimLink = document.querySelector('.footer-kapcsolat a[href*="google.com/maps"]');
    const telefonLink = document.querySelector('.footer-kapcsolat a[href^="tel:"]');
    const emailLink = document.querySelector('.footer-kapcsolat a[href^="mailto:"]');
    const instagramLink = document.querySelector('.social-gomb[href*="instagram"]');
    const facebookLink = document.querySelector('.social-gomb[href*="facebook"]');
    const messengerPopup = document.querySelector('.popup-gomb[href*="m.me"]');
    const instagramPopup = document.querySelector('.popup-gomb[href*="ig.me"]');

    if (cimLink && kapcsolat?.cim) {
        cimLink.textContent = kapcsolat.cim;
        cimLink.href = kapcsolat.terkepUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(kapcsolat.cim)}`;
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

    if (!lebegoGomb || foglalasGombok.length === 0) {
        return;
    }

    const lathatosagFigyelo = new IntersectionObserver(function (entries) {
        const alsoGombLatszik = entries.some(entry => entry.isIntersecting);
        lebegoGomb.classList.toggle('rejtve', alsoGombLatszik);
    }, {
        threshold: 0.25
    });

    foglalasGombok.forEach(gomb => lathatosagFigyelo.observe(gomb));
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
