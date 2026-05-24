
const metaThemeColor = document.createElement('meta');
metaThemeColor.name = "theme-color";
metaThemeColor.content = "#fdf4e2";
document.head.appendChild(metaThemeColor);// 1. A gomb és linkek kattintása
function menuToggle() {
    document.getElementById("mobil-nav").classList.toggle("open");
}

// 2. Bezárás, ha a menün kívülre kattintanak
document.addEventListener('click', function (event) {
    var menu = document.getElementById("mobil-nav");
    var hamburger = document.querySelector(".hamburger");

    if (menu && hamburger) {
        if (menu.classList.contains('open') && !menu.contains(event.target) && !hamburger.contains(event.target)) {
            menu.classList.remove('open');
        }
    }

});
fetch('header.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('fejlec-helye').innerHTML = data;
    });
// 1. OKOS TELEFONSZÁM TISZTÍTÓ
function csakSzamokatEnged(input) {
    let szamok = input.value.replace(/[^0-9]/g, '');

    // 1. Lépés: Országkódok (0036, 36, 06) levágása
    if (szamok.startsWith('0036')) {
        szamok = szamok.substring(4);
    } else if (szamok.startsWith('36')) {
        szamok = szamok.substring(2);
    } else if (szamok.startsWith('06')) {
        szamok = szamok.substring(2);
    }

    // 2. Lépés: Ha a maradék szám 0-val kezdődik, azt is levágjuk!
    // Így a 070-ből azonnal 70 lesz.
    while (szamok.startsWith('0')) {
        szamok = szamok.substring(1);
    }

    // 3. Lépés: Biztonsági vágás max 9 karakterre
    if (szamok.length > 9) {
        szamok = szamok.substring(0, 9);
    }

    // Visszaírjuk a letisztított számot a mezőbe
    input.value = szamok;
}

// 2. IDŐPONTOK GENERÁLÁSA (Ezt hoztuk most vissza!)
window.onload = function () {
    const idoValaszto = document.getElementById('foglalas-ido');
    const kezdoOra = 8;
    const vegOra = 18;

    for (let ora = kezdoOra; ora <= vegOra; ora++) {
        for (let perc = 0; perc < 60; perc += 15) {
            if (ora === vegOra && perc > 0) break;

            const pStr = perc === 0 ? '00' : perc;
            const oStr = ora < 10 ? '0' + ora : ora;
            const idopont = `${oStr}:${pStr}`;

            const option = document.createElement('option');
            option.value = idopont;
            option.textContent = idopont;
            idoValaszto.appendChild(option);
        }
    }
};

// 3. FOGLALÁS INDÍTÁSA
function foglalasInditasa() {
    const nev = document.getElementById('foglalas-nev').value;
    const telReszlet = document.getElementById('foglalas-tel').value;
    const szolgatatas = document.getElementById('foglalas-szolgatatas').value;
    const datum = document.getElementById('foglalas-datum').value;
    const ido = document.getElementById('foglalas-ido').value;
    const komment = document.getElementById('foglalas-komment').value;

    if (!nev || !telReszlet || !szolgatatas || !datum || !ido) {
        alert("Kérlek tölts ki minden kötelező mezőt a folytatáshoz!");
        return;
    }

    const teljesTelefon = `+36 ${telReszlet}`;
    const uzenet = `Szia! Szeretnék időpontot foglalni.\n\nNév: ${nev}\nTelefon: ${teljesTelefon}\nSzolgáltatás: ${szolgatatas}\nDátum: ${datum} - ${ido} óra\nMegjegyzés: ${komment ? komment : '-'}\n\nKérlek jelezz vissza, hogy megfelel-e.\nKöszönöm!`;

    navigator.clipboard.writeText(uzenet).then(() => {
        document.getElementById('sikeres-popup').style.display = 'flex';
    }).catch(err => {
        alert("A böngésződ blokkolta a másolást. Kérlek írj rám manuálisan!");
    });
}

// 4. POPUP BEZÁRÁSA
function popupBezarasa() {
    document.getElementById('sikeres-popup').style.display = 'none';
}