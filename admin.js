let adminAdatok = null;

document.addEventListener('DOMContentLoaded', adminInditasa);

async function adminInditasa() {
    const form = document.getElementById('admin-form');

    if (!form) {
        return;
    }

    adminAdatok = await adminAdatokBetoltese();
    adminAdatokTisztitasa();
    adminRendereles();

    document.getElementById('admin-letoltes').addEventListener('click', adminLetoltes);
    document.getElementById('admin-import').addEventListener('change', adminImport);
}

async function adminAdatokBetoltese() {
    const response = await fetch('/adatok.json', { cache: 'no-cache' });

    if (!response.ok) {
        throw new Error('Az adatok.json nem tölthető be.');
    }

    return response.json();
}

function adminRendereles() {
    const form = document.getElementById('admin-form');
    form.innerHTML = '';

    form.append(
        adminAltalanosPanel(),
        adminFooldalPanel(),
        adminSzolgaltatasPanel(),
        adminArlistaPanel(),
        adminFoglalasPanel(),
        adminPopupPanel(),
        adminKepekPanel()
    );
}

function adminPanel(cim, leiras) {
    const panel = document.createElement('section');
    panel.className = 'admin-panel';

    const fej = document.createElement('div');
    fej.className = 'admin-panel-fej';

    const h2 = document.createElement('h2');
    h2.textContent = cim;

    const p = document.createElement('p');
    p.textContent = leiras;

    fej.append(h2, p);
    panel.appendChild(fej);

    return panel;
}

function adminMezo(szulo, cimke, utvonal, opciok = {}) {
    const wrapper = document.createElement('label');
    wrapper.className = `admin-mezo${opciok.szeles ? ' admin-mezo-szeles' : ''}`;

    const span = document.createElement('span');
    span.textContent = cimke;
    wrapper.appendChild(span);

    const ertek = adminErtek(utvonal);
    const input = opciok.tobbsoros ? document.createElement('textarea') : document.createElement('input');

    input.dataset.adminPath = utvonal;

    if (opciok.checkbox) {
        input.type = 'checkbox';
        input.checked = Boolean(ertek);
        wrapper.classList.add('admin-checkbox');
    } else {
        input.value = ertek ?? '';
        input.placeholder = opciok.placeholder || '';

        if (opciok.tobbsoros) {
            input.rows = opciok.sorok || 4;
        } else {
            input.type = opciok.tipus || 'text';

            if (opciok.tipus === 'number') {
                input.min = '0';
                input.step = '1';
                input.inputMode = 'numeric';
            }
        }
    }

    wrapper.appendChild(input);
    szulo.appendChild(wrapper);

    return input;
}

function adminAltalanosPanel() {
    const panel = adminPanel('Általános adatok', 'Név, rövid leírás és elérhetőségek.');
    const grid = adminGrid();

    adminMezo(grid, 'Márkanév', 'marka.nev');
    adminMezo(grid, 'Lábléc rövid leírás', 'marka.rovidLeiras', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Cím', 'kapcsolat.cim');
    adminMezo(grid, 'Telefonszám megjelenítése', 'kapcsolat.telefonLathato', { checkbox: true });
    adminMezo(grid, 'Telefon megjelenítve', 'kapcsolat.telefon');
    adminMezo(grid, 'Telefon linkhez', 'kapcsolat.telefonLink');
    adminMezo(grid, 'Email', 'kapcsolat.email');
    adminMezo(grid, 'Instagram link', 'kapcsolat.instagram', { szeles: true });
    adminMezo(grid, 'Facebook link', 'kapcsolat.facebook', { szeles: true });
    adminMezo(grid, 'Messenger üzenet link', 'kapcsolat.messenger', { szeles: true });
    adminMezo(grid, 'Instagram üzenet link', 'kapcsolat.instagramUzenet', { szeles: true });
    panel.appendChild(grid);

    return panel;
}

function adminFooldalPanel() {
    const panel = adminPanel('Főoldal szövegek', 'Hero, bemutatkozás, galéria átvezető és foglalási blokk.');
    const grid = adminGrid();

    adminMezo(grid, 'Hero felső kis szöveg', 'fooldal.hero.kicker');
    adminMezo(grid, 'Hero cím', 'fooldal.hero.cim');
    adminMezo(grid, 'Hero leírás', 'fooldal.hero.leiras', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Bemutatkozás cím', 'fooldal.bemutatkozas.cim');
    adminMezo(grid, 'Bemutatkozás 1. bekezdés', 'fooldal.bemutatkozas.bekezdesek.0', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Bemutatkozás 2. bekezdés', 'fooldal.bemutatkozas.bekezdesek.1', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Galéria blokk címe', 'fooldal.galeriaAtvezeto.cim');
    adminMezo(grid, 'Galéria blokk leírása', 'fooldal.galeriaAtvezeto.leiras', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Galéria gomb szöveg', 'fooldal.galeriaAtvezeto.gombSzoveg');
    adminMezo(grid, 'Foglalási blokk cím', 'fooldal.foglalasAtvezeto.cim');
    adminMezo(grid, 'Foglalási blokk leírás', 'fooldal.foglalasAtvezeto.leiras', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Foglalási gomb szöveg', 'fooldal.foglalasAtvezeto.gombSzoveg');
    panel.appendChild(grid);

    return panel;
}

function adminSzolgaltatasPanel() {
    const panel = adminPanel('Szolgáltatás kártyák', 'A főoldali szolgáltatás kártyák címei és leírásai.');
    const grid = adminGrid();
    adminMezo(grid, 'Szekció címe', 'fooldal.szolgaltatasok.cim');
    panel.appendChild(grid);

    const lista = document.createElement('div');
    lista.className = 'admin-lista';
    panel.appendChild(lista);

    adminAdatok.fooldal.szolgaltatasok.kartyak.forEach((kartya, index) => {
        const elem = adminListaElem(`Kártya ${index + 1}`, () => {
            adminMutacio(() => adminAdatok.fooldal.szolgaltatasok.kartyak.splice(index, 1), 'Kártya törölve.');
        });

        adminMezo(elem, 'Cím', `fooldal.szolgaltatasok.kartyak.${index}.cim`);
        adminMezo(elem, 'Leírás', `fooldal.szolgaltatasok.kartyak.${index}.leiras`, { tobbsoros: true, szeles: true });
        adminMezo(elem, 'Széles kártya', `fooldal.szolgaltatasok.kartyak.${index}.szeles`, { checkbox: true });
        lista.appendChild(elem);
    });

    panel.appendChild(adminHozzaadasGomb('Új szolgáltatás kártya', () => {
        adminMutacio(() => {
            adminAdatok.fooldal.szolgaltatasok.kartyak.push({
                cim: 'Új szolgáltatás',
                leiras: 'Rövid leírás',
                szeles: false
            });
        }, 'Új kártya hozzáadva.');
    }));

    return panel;
}

function adminArlistaPanel() {
    const panel = adminPanel('Árlista', 'Árak, időtartamok és árlista megjegyzés.');
    const grid = adminGrid();
    adminMezo(grid, 'Árlista cím', 'arlista.cim');
    adminMezo(grid, 'Árlista leírás', 'arlista.leiras', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Megjegyzés', 'arlista.megjegyzes', { tobbsoros: true, szeles: true });
    panel.appendChild(grid);

    const lista = document.createElement('div');
    lista.className = 'admin-lista';
    panel.appendChild(lista);

    adminAdatok.arlista.csoportok.forEach((csoport, csoportIndex) => {
        const csoportElem = adminListaElem(`Árlista csoport ${csoportIndex + 1}`, () => {
            adminMutacio(() => adminAdatok.arlista.csoportok.splice(csoportIndex, 1), 'Árlista csoport törölve.');
        });

        adminMezo(csoportElem, 'Csoport címe', `arlista.csoportok.${csoportIndex}.cim`);

        csoport.tetelek.forEach((tetel, tetelIndex) => {
            const sor = document.createElement('div');
            sor.className = 'admin-arlista-sor';

            adminMezo(sor, 'Név', `arlista.csoportok.${csoportIndex}.tetelek.${tetelIndex}.nev`);
            adminMezo(sor, 'Ár', `arlista.csoportok.${csoportIndex}.tetelek.${tetelIndex}.ar`);
            adminMezo(sor, 'Óra', `arlista.csoportok.${csoportIndex}.tetelek.${tetelIndex}.idoOra`, { tipus: 'number' });
            adminMezo(sor, 'Perc', `arlista.csoportok.${csoportIndex}.tetelek.${tetelIndex}.idoPerc`, { tipus: 'number' });
            adminMezo(sor, 'Foglalásban látszik', `arlista.csoportok.${csoportIndex}.tetelek.${tetelIndex}.foglalasban`, { checkbox: true });

            const torles = adminKisGomb('Sor törlése', () => {
                adminMutacio(() => adminAdatok.arlista.csoportok[csoportIndex].tetelek.splice(tetelIndex, 1), 'Árlista sor törölve.');
            });
            sor.appendChild(torles);
            csoportElem.appendChild(sor);
        });

        csoportElem.appendChild(adminHozzaadasGomb('Új sor ebbe a csoportba', () => {
            adminMutacio(() => {
            adminAdatok.arlista.csoportok[csoportIndex].tetelek.push({
                nev: 'Új szolgáltatás',
                ar: '0 Ft',
                idoOra: 1,
                idoPerc: 0,
                foglalasban: true
            });
            }, 'Új árlista sor hozzáadva.');
        }));

        lista.appendChild(csoportElem);
    });

    panel.appendChild(adminHozzaadasGomb('Új árlista csoport', () => {
        adminMutacio(() => {
            adminAdatok.arlista.csoportok.push({
                cim: 'Új csoport',
                tetelek: [
                    {
                        nev: 'Új szolgáltatás',
                        ar: '0 Ft',
                        idoOra: 1,
                        idoPerc: 0,
                        foglalasban: true
                    }
                ]
            });
        }, 'Új árlista csoport hozzáadva.');
    }));

    return panel;
}

function adminFoglalasPanel() {
    const panel = adminPanel('Foglalás oldal', 'A foglalási oldal szövegei. A választható szolgáltatások automatikusan az árlistából jönnek.');
    const grid = adminGrid();
    adminMezo(grid, 'Oldal címe', 'foglalas.cim');
    adminMezo(grid, 'Leírás', 'foglalas.leiras', { tobbsoros: true, szeles: true });
    adminMezo(grid, 'Küldés gomb szöveg', 'foglalas.kuldesGomb');
    adminMezo(grid, 'Lebegő gomb szöveg', 'foglalas.lebegoGomb');
    panel.appendChild(grid);

    const info = document.createElement('p');
    info.className = 'admin-info';
    info.textContent = 'A foglalási legördülő listát az Árlista rész tételeiből rakja össze az oldal. Árlista soronként pipálhatod, mi jelenjen meg a foglalásnál. Időhöz csak az óra és perc számát írd be; ha valamelyik 0 vagy üres, azt a weboldal nem írja ki.';
    panel.appendChild(info);

    return panel;
}

function adminPopupPanel() {
    const panel = adminPanel('Felugró ablak', 'A foglalási adatok másolása után megjelenő ablak szövegei és gombfeliratai.');
    const grid = adminGrid();

    adminMezo(grid, 'Sikeres másolás címe', 'foglalas.popup.sikeresCim');
    adminMezo(grid, 'Sikeres másolás szövege', 'foglalas.popup.sikeresSzoveg', { tobbsoros: true, szeles: true, sorok: 4 });
    adminMezo(grid, 'Tartalék cím', 'foglalas.popup.tartalekCim');
    adminMezo(grid, 'Tartalék szöveg', 'foglalas.popup.tartalekSzoveg', { tobbsoros: true, szeles: true, sorok: 4 });
    adminMezo(grid, 'Messenger gomb', 'foglalas.popup.messengerGomb');
    adminMezo(grid, 'Instagram gomb', 'foglalas.popup.instagramGomb');
    adminMezo(grid, 'Bezárás gomb', 'foglalas.popup.bezarasGomb');
    panel.appendChild(grid);

    return panel;
}

function adminKepekPanel() {
    const panel = adminPanel('Képek útvonalai', 'Itt a főoldali, nem galériás képek fájlneveit tudod átírni.');
    const grid = adminGrid();

    adminMezo(grid, 'Bemutatkozás kép', 'fooldal.bemutatkozas.kep', { szeles: true });
    adminMezo(grid, 'Bemutatkozás kép alt szöveg', 'fooldal.bemutatkozas.kepAlt', { szeles: true });
    adminMezo(grid, 'Galéria átvezető 1 kép', 'fooldal.galeriaAtvezeto.kepek.0.src', { szeles: true });
    adminMezo(grid, 'Galéria átvezető 1 alt', 'fooldal.galeriaAtvezeto.kepek.0.alt', { szeles: true });
    adminMezo(grid, 'Galéria átvezető 2 kép', 'fooldal.galeriaAtvezeto.kepek.1.src', { szeles: true });
    adminMezo(grid, 'Galéria átvezető 2 alt', 'fooldal.galeriaAtvezeto.kepek.1.alt', { szeles: true });
    adminMezo(grid, 'Galéria átvezető 3 kép', 'fooldal.galeriaAtvezeto.kepek.2.src', { szeles: true });
    adminMezo(grid, 'Galéria átvezető 3 alt', 'fooldal.galeriaAtvezeto.kepek.2.alt', { szeles: true });
    panel.appendChild(grid);

    return panel;
}

function adminGrid() {
    const grid = document.createElement('div');
    grid.className = 'admin-grid';
    return grid;
}

function adminListaElem(cim, torlesCallback) {
    const elem = document.createElement('div');
    elem.className = 'admin-lista-elem';

    const fej = document.createElement('div');
    fej.className = 'admin-lista-fej';

    const h3 = document.createElement('h3');
    h3.textContent = cim;

    fej.append(h3, adminKisGomb('Törlés', torlesCallback));
    elem.appendChild(fej);

    return elem;
}

function adminHozzaadasGomb(szoveg, callback) {
    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'admin-hozzaadas';
    gomb.textContent = szoveg;
    gomb.addEventListener('click', callback);
    return gomb;
}

function adminKisGomb(szoveg, callback) {
    const gomb = document.createElement('button');
    gomb.type = 'button';
    gomb.className = 'admin-kis-gomb';
    gomb.textContent = szoveg;
    gomb.addEventListener('click', callback);
    return gomb;
}

function adminMutacio(callback, uzenet) {
    adminAdatokUrlapbol();
    callback();
    adminRendereles();
    adminStatus(uzenet);
}

function adminAdatokUrlapbol() {
    document.querySelectorAll('[data-admin-path]').forEach(input => {
        adminErtekBeallitasa(input.dataset.adminPath, input.type === 'checkbox' ? input.checked : input.value);
    });
    adminAdatokTisztitasa();
}

function adminAdatokTisztitasa() {
    if (adminAdatok?.foglalas && !adminAdatok.foglalas.popup) {
        adminAdatok.foglalas.popup = {
            sikeresCim: 'Adatok másolva!',
            sikeresSzoveg: 'A foglalásod szövegét vágólapra másoltuk. Válaszd ki, hol szeretnéd elküldeni nekem, majd nyomj a Beillesztés gombra a chaten!',
            tartalekCim: 'Adatok előkészítve',
            tartalekSzoveg: 'A böngésződ most nem engedte az automatikus másolást. Jelöld ki az alábbi szöveget, másold ki, majd küldd el üzenetben.',
            messengerGomb: 'Messenger',
            instagramGomb: 'Instagram',
            bezarasGomb: 'Mégse, visszalépek'
        };
    }

    if (adminAdatok?.foglalas?.szolgaltatasok) {
        delete adminAdatok.foglalas.szolgaltatasok;
    }

    (adminAdatok?.arlista?.csoportok || []).forEach(csoport => {
        (csoport.tetelek || []).forEach(tetel => {
            if (tetel.idoOra === undefined && tetel.idoPerc === undefined) {
                const ido = adminIdoSzamok(tetel.ido);
                tetel.idoOra = ido.vanIdo ? ido.ora : '';
                tetel.idoPerc = ido.vanIdo ? ido.perc : '';
            }

            if (tetel.foglalasban === undefined) {
                tetel.foglalasban = true;
            }

            delete tetel.ido;
        });
    });
}

function adminIdoSzamok(idoSzoveg) {
    if (!idoSzoveg || !idoSzoveg.trim()) {
        return { ora: '', perc: '', vanIdo: false };
    }

    return {
        ora: adminPozitivEgesz((idoSzoveg.match(/(\d+)\s*óra/i) || [])[1]),
        perc: adminPozitivEgesz((idoSzoveg.match(/(\d+)\s*perc/i) || [])[1]),
        vanIdo: true
    };
}

function adminPozitivEgesz(ertek) {
    const szam = Number.parseInt(ertek, 10);
    return Number.isFinite(szam) && szam > 0 ? szam : 0;
}

function adminLetoltes() {
    adminAdatokUrlapbol();

    const json = JSON.stringify(adminAdatok, null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'adatok.json';
    link.click();
    URL.revokeObjectURL(url);
    adminStatus('Az adatok.json letöltve. Ezt töltsd fel GitHubon a fő mappába.');
}

function adminImport(event) {
    const fajl = event.target.files[0];

    if (!fajl) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            adminAdatok = JSON.parse(reader.result);
            adminAdatokTisztitasa();
            adminRendereles();
            adminStatus('A JSON fájl betöltve.');
        } catch (error) {
            adminStatus('Nem sikerült beolvasni a JSON fájlt.');
        }
    };
    reader.readAsText(fajl);
}

function adminStatus(uzenet) {
    const status = document.getElementById('admin-status');
    status.textContent = uzenet;
}

function adminErtek(utvonal) {
    return utvonal.split('.').reduce((aktualis, kulcs) => aktualis?.[kulcs], adminAdatok);
}

function adminErtekBeallitasa(utvonal, ertek) {
    const kulcsok = utvonal.split('.');
    const utolsoKulcs = kulcsok.pop();
    const cel = kulcsok.reduce((aktualis, kulcs) => aktualis[kulcs], adminAdatok);
    cel[utolsoKulcs] = ertek;
}
