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
        popupCim.textContent = popupAdatok.emailSikeresCim || 'Adatok másolva!';
        popupSzoveg.innerHTML = sortoresesSzoveg(popupAdatok.emailSikeresSzoveg || 'A foglalás adatai előkészítve.');
        popupUzenet.classList.remove('lathato');
        popupUzenet.value = '';
    } else {
        popupCim.textContent = popupAdatok.emailHibaCim || 'Foglalás rögzítve';
        popupSzoveg.innerHTML = sortoresesSzoveg(popupAdatok.emailHibaSzoveg || 'A foglalás bekerült a rendszerbe, de az email értesítést ellenőrizni kell.');
        popupUzenet.value = uzenet;
        popupUzenet.classList.add('lathato');
        setTimeout(() => popupUzenet.select(), 100);
    }

    popup.style.display = 'flex';
}

function popupBezarasa() {
    document.getElementById('sikeres-popup').style.display = 'none';
}
