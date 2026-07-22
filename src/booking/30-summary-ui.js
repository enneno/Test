    function osszefoglaloFrissitese(elemek) {
        if (!elemek.osszefoglalo) return;

        const szolgaltatasObj = allapot.szolgaltatasok.find(szolgaltatas => szolgaltatas.id === elemek.szolgaltatas.value);
        const szolgaltatas = szolgaltatasObj ? (szolgaltatasObj.description?.trim() || szolgaltatasObj.name) : selectedText(elemek.szolgaltatas);
        const stilus = document.querySelector('input[name="korom-stilus"]:checked')?.value || '';
        const datum = selectedText(elemek.datum);
        const ido = selectedText(elemek.ido);
        const files = Array.from(elemek.kepInput?.files || []);
        const megjegyzes = elemek.komment?.value.trim() || '';
        const nev = elemek.nev?.value.trim() || '';
        const telefon = elemzesTelefon(elemek.telefon?.value || '');
        const email = elemek.email?.value.trim() || '';
        const kupon = kuponOsszegAdatok(szolgaltatasObj, allapot.aktivKupon);

        const sorok = [
            ['Szolgáltatás', szolgaltatas],
            ['Stílus', stilus],
            ['Időpont', [datum, ido].filter(Boolean).join(' · ')],
            ['Alapár', kupon.baseLabel || (szolgaltatasObj ? szolgaltatasArFelirat(szolgaltatasObj) : '')],
            ['Kupon', kupon.code ? `${kupon.code} - ${kupon.discountLabel}` : ''],
            ['Kedvezmény', kupon.discountAmount > 0 ? `-${arFelirat(kupon.discountAmount, kupon.unit)}` : ''],
            ['Végösszeg', kupon.finalLabel || ''],
            ['Inspiráció', files.length ? `${files.length} kép kiválasztva` : 'Nincs kép kiválasztva'],
            ['Megjegyzés', megjegyzes],
            ['Elérhetőség', [nev, telefon ? `+36 ${telefon}` : '', email].filter(Boolean).join(' · ')]
        ].filter(([, ertek]) => ertek);

        if (!sorok.length) {
            elemek.osszefoglalo.innerHTML = '<h3>Foglalás összefoglaló</h3><p>Válaszd ki a szolgáltatást, stílust, dátumot és időpontot, és itt látod majd egyben a foglalásodat.</p>';
            return;
        }

        elemek.osszefoglalo.innerHTML = `
            <h3>Foglalás összefoglaló</h3>
            <dl>${sorok.map(([cim, ertek]) => `<div class="${cim === 'Végösszeg' ? 'foglalas-vegosszeg-sor' : ''}"><dt>${html(cim)}</dt><dd>${html(ertek)}</dd></div>`).join('')}</dl>
        `;
    }

    function selectedText(select) {
        const option = select?.selectedOptions?.[0];
        if (!option || !option.value) return '';
        return option.textContent.trim();
    }

    function kovetkezoReszhezGordit(cel, kesleltetes = 120) {
        const elem = typeof cel === 'string' ? document.querySelector(cel) : cel;
        if (!elem) return;

        window.setTimeout(() => {
            const fejlec = document.querySelector('header');
            const fejlecAlja = fejlec ? Math.ceil(fejlec.getBoundingClientRect().bottom) : 0;
            const res = window.matchMedia('(max-width: 760px)').matches ? 18 : 24;
            const aktualisPozicio = window.scrollY || document.documentElement.scrollTop || 0;
            const celPozicio = elem.getBoundingClientRect().top + aktualisPozicio - fejlecAlja - res;

            window.scrollTo({
                top: Math.max(0, celPozicio),
                behavior: 'smooth'
            });
        }, kesleltetes);
    }
    function selectAllapot(select, szoveg) {
        if (!select) return;
        select.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.disabled = true;
        option.selected = true;
        option.textContent = szoveg;
        select.appendChild(option);
    }

    function kartyaUzenet(container, szoveg) {
        if (!container) return;
        if (container.id === 'foglalas-datum-kartyak') {
            container.classList.remove('foglalas-datum-csik');
            container.classList.add('foglalas-mini-racs');
        }
        container.innerHTML = `<p class="foglalas-kartya-uzenet">${html(szoveg)}</p>`;
    }

    function kartyaAktivAllapot(container, value) {
        if (!container) return;
        container.querySelectorAll('[data-value]').forEach(kartya => {
            kartya.classList.toggle('aktiv', Boolean(value) && kartya.dataset.value === value);
        });
    }

    function datumFelirat(datumSzoveg) {
        const [ev, honap, nap] = datumSzoveg.split('-').map(Number);
        return new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'long'
        }).format(new Date(ev, honap - 1, nap, 12, 0, 0));
    }

    function statuszKiirasa(elem, szoveg, hiba = false) {
        if (!elem) return;
        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
        elem.classList.toggle('foglalas-statusz-kiemelt', Boolean(hiba && szoveg));
    }

    function mezokTiltasa(elemek, tiltva) {
        elemek.urlap?.querySelectorAll('input, select, textarea, button').forEach(elem => {
            elem.disabled = tiltva;
        });
    }

    function gombAllapot(gomb, tiltva, szoveg) {
        if (!gomb) return;
        gomb.disabled = tiltva;
        gomb.textContent = szoveg;
    }

    function sikeresPopupNyitasa(emailEredmeny = { ok: false }) {
        const popup = document.getElementById('sikeres-popup');
        const popupCim = popup?.querySelector('.popup-cim');
        const popupSzoveg = popup?.querySelector('.popup-szoveg');
        const popupAdatok = window.lumiAdatok?.foglalas?.popup || {};
        const emailSikerult = Boolean(emailEredmeny.ok);

        if (popupCim) {
            popupCim.textContent = emailSikerult
                ? (popupAdatok.emailSikeresCim || 'Foglalás elküldve')
                : (popupAdatok.emailHibaCim || 'Foglalás rögzítve');
        }

        if (popupSzoveg) {
            popupSzoveg.textContent = emailSikerult
                ? (popupAdatok.emailSikeresSzoveg || 'Köszönöm, megkaptam a foglalásodat. A visszaigazoló emailt is elküldtük.')
                : (popupAdatok.emailHibaSzoveg || 'A foglalásod bekerült a rendszerbe, de a visszaigazoló email most nem biztos, hogy elment.');
        }

        if (popup) popup.style.display = 'flex';
    }

    function naptarLinkFrissitese(adatok) {
        const link = document.getElementById('naptar-link');

        if (!link || !adatok.startsAt || !adatok.szolgaltatas) return;

        const kezdes = new Date(adatok.startsAt);
        const idotartamPerc = adatok.szolgaltatas.duration_minutes > 0 ? adatok.szolgaltatas.duration_minutes : 30;
        const vege = new Date(kezdes.getTime() + idotartamPerc * 60000);
        const cim = `Lumi Nails - ${adatok.szolgaltatas.name}`;
        const leiras = `Foglalás: ${adatok.szolgaltatas.name}\nKöröm stílus: ${adatok.koromStilus}\nNév: ${adatok.nev}\nTelefon: ${adatok.telefon}`;
        const helyszin = '2800 Tatabánya, Kós Károly út';
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Lumi Nails//Booking//HU',
            'BEGIN:VEVENT',
            `UID:${Date.now()}@luminails.hu`,
            `DTSTAMP:${icsDatum(new Date())}`,
            `DTSTART:${icsDatum(kezdes)}`,
            `DTEND:${icsDatum(vege)}`,
            `SUMMARY:${icsSzoveg(cim)}`,
            `DESCRIPTION:${icsSzoveg(leiras)}`,
            `LOCATION:${icsSzoveg(helyszin)}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });

        if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);

        const url = URL.createObjectURL(blob);
        link.href = url;
        link.dataset.url = url;
        link.download = 'lumi-nails-foglalas.ics';
        link.hidden = false;
    }

    function szolgaltatasFelirat(szolgaltatas) {
        const reszek = [szolgaltatas.description?.trim() || szolgaltatas.name];
        const ar = szolgaltatasArFelirat(szolgaltatas);
        if (ar) reszek.push(ar);
        if (szolgaltatas.duration_minutes > 0) reszek.push(idoFelirat(szolgaltatas.duration_minutes));
        return reszek.join(' - ');
    }

    function idoFelirat(percOsszesen) {
        const ora = Math.floor((percOsszesen || 0) / 60);
        const perc = (percOsszesen || 0) % 60;
        const reszek = [];
        if (ora > 0) reszek.push(`${ora} óra`);
        if (perc > 0) reszek.push(`${perc} perc`);
        return reszek.join(' ') || '';
    }

    function elemzesTelefon(ertek) {
        let szamok = String(ertek || '').replace(/\D/g, '');
        if (szamok.startsWith('36')) {
            szamok = szamok.substring(2);
        } else if (szamok.startsWith('06')) {
            szamok = szamok.substring(2);
        }
        while (szamok.startsWith('0')) szamok = szamok.substring(1);
        return szamok.substring(0, 9);
    }
