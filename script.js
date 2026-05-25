const metaThemeColor = document.createElement('meta');
metaThemeColor.name = 'theme-color';
metaThemeColor.content = '#fdf4e2';
document.head.appendChild(metaThemeColor);

document.addEventListener('DOMContentLoaded', function () {
    fejlecBetoltese();
    idopontokGeneralasa();
    datumMinimumBeallitasa();
    foglalasiUrlapBekotese();
    lebegoFoglalasLetrehozasa();
    lebegoFoglalasFigyeles();
});

function fejlecBetoltese() {
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            const fejlecHelye = document.getElementById('fejlec-helye');

            if (!fejlecHelye) {
                return;
            }

            fejlecHelye.innerHTML = data;
            menuEsemenyekBekotese();
        });
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

    if (!idoValaszto) {
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

    if (telefonMezo) {
        telefonMezo.addEventListener('input', () => csakSzamokatEnged(telefonMezo));
    }

    if (kuldesGomb) {
        kuldesGomb.addEventListener('click', foglalasInditasa);
    }

    if (popupBezarasGomb) {
        popupBezarasGomb.addEventListener('click', popupBezarasa);
    }
}

function lebegoFoglalasLetrehozasa() {
    if (foglalasOldal() || document.getElementById('lebego-foglalas-gomb')) {
        return;
    }

    const gomb = document.createElement('a');
    gomb.href = 'foglalas.html';
    gomb.id = 'lebego-foglalas-gomb';
    gomb.className = 'lebego-foglalas-gomb';
    gomb.textContent = 'Időpontfoglalás';
    document.body.appendChild(gomb);
}

function foglalasOldal() {
    const fajlnev = window.location.pathname.split('/').pop().toLowerCase();
    return fajlnev === 'foglalas.html';
}

function lebegoFoglalasFigyeles() {
    const lebegoGomb = document.getElementById('lebego-foglalas-gomb');
    const foglalasGombok = Array.from(document.querySelectorAll('a.gomb[href*="foglalas.html"]'))
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

    if (sikeresMasolas) {
        popupCim.textContent = 'Adatok másolva! ✓';
        popupSzoveg.innerHTML = 'A foglalásod szövegét vágólapra másoltuk. Válaszd ki, hol szeretnéd elküldeni nekem, majd nyomj a <b>Beillesztés</b> (Paste) gombra a chaten!';
        popupUzenet.classList.remove('lathato');
        popupUzenet.value = '';
    } else {
        popupCim.textContent = 'Adatok előkészítve';
        popupSzoveg.innerHTML = 'A böngésződ most nem engedte az automatikus másolást. Jelöld ki az alábbi szöveget, másold ki, majd küldd el üzenetben.';
        popupUzenet.value = uzenet;
        popupUzenet.classList.add('lathato');
        setTimeout(() => popupUzenet.select(), 100);
    }

    popup.style.display = 'flex';
}

function popupBezarasa() {
    document.getElementById('sikeres-popup').style.display = 'none';
}
