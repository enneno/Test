(function () {
    const allapot = {
        adatok: null,
        modositva: false
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', adminInditasa);
    } else {
        adminInditasa();
    }

    function adminInditasa() {
        const form = document.getElementById('admin-json-form');

        if (!form) {
            return;
        }

        form.addEventListener('input', jsonMezoValtozas);
        form.addEventListener('change', jsonMezoValtozas);
        form.addEventListener('click', jsonListaKattintas);

        document.getElementById('admin-adatok-letoltes')?.addEventListener('click', adatokLetoltese);
        document.getElementById('admin-adatok-betoltes')?.addEventListener('change', adatokBetolteseFajlbol);
        window.lumiAdminAdatokLetoltese = adatokLetoltese;
        window.lumiAdminAdatokModositva = () => allapot.modositva;

        adatokBetolteseAdminhoz();
    }

    async function adatokBetolteseAdminhoz() {
        try {
            jsonStatusz('Adatok betöltése...');
            const valasz = await fetch(`/adatok.json?v=${Date.now()}`, { cache: 'no-store' });

            if (!valasz.ok) {
                throw new Error('Nem elérhető az adatok.json fájl.');
            }

            allapot.adatok = await valasz.json();
            adminJsonRenderelese();
            jsonStatusz('Az oldal szövegei betöltve.');
        } catch (error) {
            jsonStatusz(`Nem sikerült betölteni az adatokat. ${error.message}`, true);
        }
    }

    function adminJsonRenderelese() {
        const form = document.getElementById('admin-json-form');

        if (!form || !allapot.adatok) {
            return;
        }

        form.innerHTML = '';

        szakaszRenderelese(form, 'Márka', [
            mezo('marka.nev', 'Márkanév'),
            mezo('marka.rovidLeiras', 'Rövid leírás', 'textarea', true)
        ]);

        szakaszRenderelese(form, 'Elérhetőségek', [
            mezo('kapcsolat.cimke', 'Blokk címe'),
            mezo('kapcsolat.cim', 'Cím'),
            mezo('kapcsolat.telefon', 'Telefonszám'),
            mezo('kapcsolat.telefonLink', 'Telefon link'),
            mezo('kapcsolat.email', 'Email'),
            mezo('kapcsolat.instagram', 'Instagram link'),
            mezo('kapcsolat.instagramUzenet', 'Instagram üzenet link'),
            mezo('kapcsolat.facebook', 'Facebook link'),
            mezo('kapcsolat.messenger', 'Messenger link'),
            mezo('kapcsolat.terkepUrl', 'Térkép link', 'text', true)
        ]);

        szakaszRenderelese(form, 'Főoldal hero', [
            mezo('fooldal.hero.kicker', 'Kis felirat'),
            mezo('fooldal.hero.cim', 'Főcím'),
            mezo('fooldal.hero.leiras', 'Leírás', 'textarea', true)
        ]);

        szakaszRenderelese(form, 'Bemutatkozás', [
            mezo('fooldal.bemutatkozas.cim', 'Cím'),
            mezo('fooldal.bemutatkozas.kep', 'Kép útvonala'),
            mezo('fooldal.bemutatkozas.kepAlt', 'Kép leírása')
        ]);
        szovegListaRenderelese(form, 'Bemutatkozás bekezdései', 'fooldal.bemutatkozas.bekezdesek');

        szakaszRenderelese(form, 'Szolgáltatások főoldali blokk', [
            mezo('fooldal.szolgaltatasok.cim', 'Szekció címe')
        ]);
        objektumListaRenderelese(form, 'Szolgáltatás kártyák', 'fooldal.szolgaltatasok.kartyak', 'szolgaltatasKartya', [
            mezo('cim', 'Cím'),
            mezo('leiras', 'Leírás', 'textarea', true),
            mezo('szeles', 'Széles kártya', 'checkbox')
        ]);

        szakaszRenderelese(form, 'Galéria átvezető', [
            mezo('fooldal.galeriaAtvezeto.cim', 'Cím'),
            mezo('fooldal.galeriaAtvezeto.leiras', 'Leírás', 'textarea', true),
            mezo('fooldal.galeriaAtvezeto.gombSzoveg', 'Gomb szövege')
        ]);
        objektumListaRenderelese(form, 'Galéria átvezető képei', 'fooldal.galeriaAtvezeto.kepek', 'galeriaKep', [
            mezo('src', 'Kép útvonala'),
            mezo('alt', 'Kép leírása')
        ]);

        szakaszRenderelese(form, 'Foglalás átvezető', [
            mezo('fooldal.foglalasAtvezeto.cim', 'Cím'),
            mezo('fooldal.foglalasAtvezeto.leiras', 'Leírás', 'textarea', true),
            mezo('fooldal.foglalasAtvezeto.gombSzoveg', 'Gomb szövege')
        ]);

        szakaszRenderelese(form, 'Árlista oldal szövegei', [
            mezo('arlista.cim', 'Oldal címe'),
            mezo('arlista.leiras', 'Felső leírás', 'textarea', true),
            mezo('arlista.megjegyzes', 'Alsó megjegyzés', 'textarea', true)
        ]);

        szakaszRenderelese(form, 'Foglalás oldal és felugró ablak', [
            mezo('foglalas.cim', 'Oldal címe'),
            mezo('foglalas.leiras', 'Oldal leírása', 'textarea', true),
            mezo('foglalas.kuldesGomb', 'Küldés gomb'),
            mezo('foglalas.lebegoGomb', 'Lebegő gomb'),
            mezo('foglalas.popup.sikeresCim', 'Sikeres popup cím'),
            mezo('foglalas.popup.sikeresSzoveg', 'Sikeres popup szöveg', 'textarea', true),
            mezo('foglalas.popup.messengerGomb', 'Messenger gomb'),
            mezo('foglalas.popup.instagramGomb', 'Instagram gomb'),
            mezo('foglalas.popup.bezarasGomb', 'Bezárás gomb')
        ]);
    }

    function szakaszRenderelese(form, cim, mezok) {
        const szakasz = document.createElement('section');
        szakasz.className = 'admin-lista-elem';

        const fej = document.createElement('div');
        fej.className = 'admin-lista-fej';
        const h3 = document.createElement('h3');
        h3.textContent = cim;
        fej.appendChild(h3);
        szakasz.appendChild(fej);

        const grid = document.createElement('div');
        grid.className = 'admin-grid';
        mezok.forEach(mezoAdat => grid.appendChild(mezoRenderelese(mezoAdat)));
        szakasz.appendChild(grid);
        form.appendChild(szakasz);
    }

    function szovegListaRenderelese(form, cim, utvonal) {
        const szakasz = listaSzakasz(cim);
        const lista = szakasz.querySelector('.admin-lista');
        const elemek = ertek(utvonal) || [];

        elemek.forEach((_szoveg, index) => {
            const kartya = document.createElement('div');
            kartya.className = 'admin-db-kartya';
            kartya.appendChild(mezoRenderelese(mezo(`${utvonal}.${index}`, `Bekezdés ${index + 1}`, 'textarea', true)));
            kartya.appendChild(torlesGomb(utvonal, index));
            lista.appendChild(kartya);
        });

        szakasz.appendChild(hozzaadasGomb(utvonal, 'bekezdes', 'Új bekezdés'));
        form.appendChild(szakasz);
    }

    function objektumListaRenderelese(form, cim, utvonal, tipus, mezok) {
        const szakasz = listaSzakasz(cim);
        const lista = szakasz.querySelector('.admin-lista');
        const elemek = ertek(utvonal) || [];

        elemek.forEach((_elem, index) => {
            const kartya = document.createElement('div');
            kartya.className = 'admin-db-kartya';

            const fej = document.createElement('div');
            fej.className = 'admin-db-kartya-fej';
            const h3 = document.createElement('h3');
            h3.textContent = `${cim.slice(0, -1)} ${index + 1}`;
            fej.appendChild(h3);
            fej.appendChild(torlesGomb(utvonal, index));
            kartya.appendChild(fej);

            const grid = document.createElement('div');
            grid.className = 'admin-grid';
            mezok.forEach(mezoAdat => {
                grid.appendChild(mezoRenderelese({
                    ...mezoAdat,
                    utvonal: `${utvonal}.${index}.${mezoAdat.utvonal}`
                }));
            });
            kartya.appendChild(grid);
            lista.appendChild(kartya);
        });

        szakasz.appendChild(hozzaadasGomb(utvonal, tipus, 'Új elem'));
        form.appendChild(szakasz);
    }

    function listaSzakasz(cim) {
        const szakasz = document.createElement('section');
        szakasz.className = 'admin-lista-elem';

        const fej = document.createElement('div');
        fej.className = 'admin-lista-fej';
        const h3 = document.createElement('h3');
        h3.textContent = cim;
        fej.appendChild(h3);
        szakasz.appendChild(fej);

        const lista = document.createElement('div');
        lista.className = 'admin-lista';
        szakasz.appendChild(lista);

        return szakasz;
    }

    function mezo(utvonal, cimke, tipus = 'text', szeles = false) {
        return { utvonal, cimke, tipus, szeles };
    }

    function mezoRenderelese(mezoAdat) {
        const label = document.createElement('label');
        const checkboxMezo = mezoAdat.tipus === 'checkbox';
        const osztalyok = ['admin-mezo'];

        if (mezoAdat.szeles) {
            osztalyok.push('admin-mezo-szeles');
        }

        if (checkboxMezo) {
            osztalyok.push('admin-checkbox');
        }

        label.className = osztalyok.join(' ');
        const cimke = document.createTextNode(mezoAdat.cimke);

        const input = mezoAdat.tipus === 'textarea'
            ? document.createElement('textarea')
            : document.createElement('input');

        if (mezoAdat.tipus === 'textarea') {
            input.rows = 4;
        } else {
            input.type = mezoAdat.tipus === 'checkbox' ? 'checkbox' : 'text';
        }

        input.dataset.jsonPath = mezoAdat.utvonal;
        const aktualis = ertek(mezoAdat.utvonal);

        if (mezoAdat.tipus === 'checkbox') {
            input.checked = Boolean(aktualis);
        } else {
            input.value = aktualis ?? '';
        }

        if (checkboxMezo) {
            label.append(input, cimke);
        } else {
            label.append(cimke, input);
        }

        return label;
    }

    function hozzaadasGomb(utvonal, tipus, szoveg) {
        const gomb = document.createElement('button');
        gomb.type = 'button';
        gomb.className = 'admin-hozzaadas';
        gomb.textContent = szoveg;
        gomb.dataset.jsonArrayAdd = utvonal;
        gomb.dataset.jsonArrayType = tipus;
        return gomb;
    }

    function torlesGomb(utvonal, index) {
        const gomb = document.createElement('button');
        gomb.type = 'button';
        gomb.className = 'admin-kis-gomb';
        gomb.textContent = 'Törlés';
        gomb.dataset.jsonArrayRemove = utvonal;
        gomb.dataset.jsonArrayIndex = String(index);
        return gomb;
    }

    function jsonMezoValtozas(event) {
        const mezoElem = event.target.closest('[data-json-path]');

        if (!mezoElem || !allapot.adatok) {
            return;
        }

        const ujErtek = mezoElem.type === 'checkbox' ? mezoElem.checked : mezoElem.value;
        ertekBeallitasa(mezoElem.dataset.jsonPath, ujErtek);
        allapot.modositva = true;
        jsonStatusz('Módosítás rögzítve az admin felületen. Élesítéshez töltsd le az adatok.json fájlt.');
    }

    function jsonListaKattintas(event) {
        const hozzaadas = event.target.closest('[data-json-array-add]');
        const torles = event.target.closest('[data-json-array-remove]');

        if (hozzaadas) {
            const lista = ertek(hozzaadas.dataset.jsonArrayAdd);

            if (Array.isArray(lista)) {
                lista.push(alapElem(hozzaadas.dataset.jsonArrayType));
                allapot.modositva = true;
                adminJsonRenderelese();
                jsonStatusz('Új elem hozzáadva. Élesítéshez töltsd le az adatok.json fájlt.');
            }
        }

        if (torles) {
            const lista = ertek(torles.dataset.jsonArrayRemove);
            const index = Number.parseInt(torles.dataset.jsonArrayIndex, 10);

            if (Array.isArray(lista) && Number.isFinite(index)) {
                lista.splice(index, 1);
                allapot.modositva = true;
                adminJsonRenderelese();
                jsonStatusz('Elem törölve. Élesítéshez töltsd le az adatok.json fájlt.');
            }
        }
    }

    function alapElem(tipus) {
        if (tipus === 'szolgaltatasKartya') {
            return { cim: 'Új szolgáltatás', leiras: '', szeles: false };
        }

        if (tipus === 'galeriaKep') {
            return { src: '', alt: '' };
        }

        return '';
    }

    function adatokLetoltese() {
        if (!allapot.adatok) {
            jsonStatusz('Nincs letölthető adat.', true);
            return;
        }

        const blob = new Blob([`${JSON.stringify(allapot.adatok, null, 4)}\n`], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'adatok.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        allapot.modositva = false;
        jsonStatusz('Az adatok.json letöltve. Ezt a fájlt töltsd fel GitHubra a régi helyére.');
    }

    function adatokBetolteseFajlbol(event) {
        const fajl = event.target.files?.[0];

        if (!fajl) {
            return;
        }

        const olvaso = new FileReader();
        olvaso.addEventListener('load', () => {
            try {
                allapot.adatok = JSON.parse(String(olvaso.result || '{}'));
                allapot.modositva = false;
                adminJsonRenderelese();
                jsonStatusz('JSON betöltve. Módosítás után töltsd le újra az adatok.json fájlt.');
            } catch (error) {
                jsonStatusz(`Nem sikerült beolvasni a JSON fájlt. ${error.message}`, true);
            }
        });
        olvaso.readAsText(fajl);
    }

    function ertek(utvonal) {
        return utvonalReszei(utvonal).reduce((aktualis, kulcs) => {
            if (aktualis == null) {
                return undefined;
            }

            return aktualis[kulcs];
        }, allapot.adatok);
    }

    function ertekBeallitasa(utvonal, ujErtek) {
        const reszek = utvonalReszei(utvonal);
        const utolso = reszek.pop();
        let aktualis = allapot.adatok;

        reszek.forEach(kulcs => {
            if (aktualis[kulcs] == null) {
                aktualis[kulcs] = {};
            }

            aktualis = aktualis[kulcs];
        });

        aktualis[utolso] = ujErtek;
    }

    function utvonalReszei(utvonal) {
        return String(utvonal).split('.').map(resz => {
            const szam = Number.parseInt(resz, 10);
            return String(szam) === resz ? szam : resz;
        });
    }

    function jsonStatusz(szoveg, hiba = false) {
        const statusz = document.getElementById('admin-json-status');

        if (!statusz) {
            return;
        }

        statusz.textContent = szoveg;
        statusz.classList.toggle('hiba', hiba);
    }
})();
