    function foglalasKezeloBekotese() {
        const form = document.getElementById('foglalas-ellenorzes-urlap');
        const input = document.getElementById('foglalas-azonosito');
        const eredmeny = document.getElementById('foglalas-ellenorzes-eredmeny');
        const statusz = document.getElementById('foglalas-ellenorzes-status');
        const lemondas = document.getElementById('foglalas-lemondas');
        const lemondasMegjegyzesBlokk = document.getElementById('foglalas-lemondas-megjegyzes-blokk');
        const lemondasMegjegyzes = document.getElementById('foglalas-lemondas-megjegyzes');
        if (!form || !input || !eredmeny || !statusz || !lemondas || !lemondasMegjegyzesBlokk || !lemondasMegjegyzes) return;
        const elemek = { input, eredmeny, statusz, lemondas, lemondasMegjegyzesBlokk, lemondasMegjegyzes };

        form.addEventListener('submit', event => {
            event.preventDefault();
            foglalasStatuszLekerdezese(input.value, elemek);
        });
        input.addEventListener('input', () => {
            input.value = foglalasAzonositoFormazasa(input.value);
            foglalasKezeloUzenet(statusz, '');
        });
        lemondas.addEventListener('click', () => foglalasLemondasa(input.value, elemek));

        const urlKod = new URLSearchParams(window.location.search).get('foglalas');
        if (urlKod) {
            input.value = foglalasAzonositoFormazasa(urlKod);
            foglalasStatuszLekerdezese(input.value, elemek);
        }
    }

    function foglalasAzonositoFormazasa(ertek) {
        let kod = String(ertek || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (kod.startsWith('LUMI')) kod = kod.slice(4);
        kod = kod.slice(0, 20);
        const csoportok = kod.match(/.{1,4}/g) || [];
        return kod ? `LUMI-${csoportok.join('-')}` : '';
    }

    function foglalasAzonositoErvenyes(kod) {
        return /^LUMI-[A-Z0-9]{4}$/.test(kod) || /^LUMI(?:-[A-Z0-9]{4}){5}$/.test(kod);
    }

    async function foglalasStatuszLekerdezese(azonosito, elemek) {
        const kod = foglalasAzonositoFormazasa(azonosito);
        if (!foglalasAzonositoErvenyes(kod)) {
            foglalasKezeloUzenet(elemek.statusz, 'Írd be a teljes, LUMI kezdetű foglalási azonosítót.', true);
            elemek.eredmeny.hidden = true;
            return;
        }
        elemek.input.value = kod;
        elemek.input.disabled = true;
        foglalasKezeloUzenet(elemek.statusz, 'Foglalás lekérése...');
        const { data, error } = await allapot.kliens.rpc('get_booking_status', { p_reference: kod });
        elemek.input.disabled = false;

        if (error) {
            console.warn('Foglalás státusz lekérési hiba:', error);
            foglalasKezeloUzenet(elemek.statusz, 'A foglalás most nem kérdezhető le. Kérlek, próbáld újra később.', true);
            elemek.eredmeny.hidden = true;
            return;
        }
        const foglalas = Array.isArray(data) ? data[0] : data;
        if (!foglalas) {
            foglalasKezeloUzenet(elemek.statusz, 'Nem találtam foglalást ezzel az azonosítóval. Ellenőrizd a kódot.', true);
            elemek.eredmeny.hidden = true;
            return;
        }
        foglalasKezeloRenderelese(foglalas, elemek);
        foglalasKezeloUzenet(elemek.statusz, '');
    }

    function foglalasKezeloRenderelese(foglalas, elemek) {
        const idopont = new Intl.DateTimeFormat('hu-HU', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest'
        }).format(new Date(foglalas.starts_at));
        const idopontVege = new Intl.DateTimeFormat('hu-HU', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest'
        }).format(new Date(foglalas.ends_at));
        const arOsszeg = foglalas.final_price_amount ?? foglalas.service_price_amount;
        const arSzam = Number(arOsszeg);
        const ar = arOsszeg !== null && arOsszeg !== undefined && Number.isFinite(arSzam)
            ? `${new Intl.NumberFormat('hu-HU').format(arSzam)} ${foglalas.service_price_unit || 'Ft'}`
            : foglalas.service_price_text || '';
        const reszletek = [
            ['Szolgáltatás', foglalas.service_name],
            ['Ár', ar],
            ['Körömstílus', foglalas.nail_style],
            ['Időpont', `${idopont} – ${idopontVege}`],
            ['Kupon', foglalas.coupon_label]
        ].filter(([, ertek]) => Boolean(ertek));
        const lemondasSzoveg = foglalas.can_cancel
            ? elemek.lemondas.dataset.leiras || 'Ha mégsem megfelelő az időpont, itt bármikor lemondhatod.'
            : 'Ez a foglalás már nem mondható le online.';

        elemek.eredmeny.innerHTML = `
            <div class="foglalas-kezelo-fej">
                <span class="foglalas-statusz-jelzo foglalas-statusz-${html(foglalas.status)}">${html(foglalas.status_label)}</span>
                <strong>${html(foglalas.booking_reference)}</strong>
            </div>
            <dl>
                ${reszletek.map(([cimke, ertek]) => `<div><dt>${html(cimke)}</dt><dd>${html(ertek)}</dd></div>`).join('')}
            </dl>
            <p class="foglalas-lemondas-hatarido">${lemondasSzoveg}</p>
        `;
        elemek.eredmeny.appendChild(elemek.lemondasMegjegyzesBlokk);
        elemek.eredmeny.appendChild(elemek.lemondas);
        elemek.lemondasMegjegyzesBlokk.hidden = !foglalas.can_cancel;
        elemek.lemondas.hidden = !foglalas.can_cancel;
        elemek.lemondas.disabled = false;
        elemek.lemondas.textContent = elemek.lemondas.dataset.felirat || 'Foglalás lemondása';
        elemek.eredmeny.hidden = false;
    }

    async function foglalasLemondasa(azonosito, elemek) {
        const kod = foglalasAzonositoFormazasa(azonosito);
        if (!window.confirm('Biztosan lemondod ezt a foglalást? Ez a művelet nem vonható vissza.')) return;
        elemek.lemondas.disabled = true;
        elemek.lemondas.textContent = 'Lemondás folyamatban...';
        const { data, error } = await allapot.kliens.rpc('cancel_booking_by_reference', {
            p_reference: kod,
            p_note: elemek.lemondasMegjegyzes.value.trim().slice(0, 500)
        });
        const valasz = Array.isArray(data) ? data[0] : data;
        if (error || !valasz?.success) {
            console.warn('Foglalás lemondási hiba:', error || valasz);
            foglalasKezeloUzenet(elemek.statusz, valasz?.message || 'A lemondás most nem sikerült. Kérlek, próbáld újra később.', true);
            elemek.lemondas.disabled = false;
            elemek.lemondas.textContent = elemek.lemondas.dataset.felirat || 'Foglalás lemondása';
            return;
        }
        elemek.lemondasMegjegyzes.value = '';
        await foglalasStatuszLekerdezese(kod, elemek);
        foglalasKezeloUzenet(elemek.statusz, valasz.message || 'A foglalást sikeresen lemondtad.');
    }

    function foglalasKezeloUzenet(elem, szoveg, hiba = false) {
        elem.textContent = szoveg;
        elem.classList.toggle('hiba', Boolean(hiba));
    }
